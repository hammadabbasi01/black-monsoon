using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace BlackMonsoon
{
    // Act 1 · Mission 1 "Quiet Harbor" — briefing (Oracle -> Rogers -> Falcon) and objective chain.
    public class Mission1 : MonoBehaviour
    {
        public static int Difficulty = 1;
        public int Kills; public string Objective = ""; public Vector3? Marker; public bool Over;
        Hud hud; PlayerController pl;

        static readonly string[][] Briefing = {
            new[] { "ORACLE", "Captain Rogers. Seventy-two hours ago a Navy convoy was hit in the Kestrel Strait. One container missing." },
            new[] { "ROGERS", "What was in the container, Major?" },
            new[] { "ORACLE", "A prototype EMP warhead. Codename MONSOON. Set it off over a port city and every light goes dark." },
            new[] { "ORACLE", "The Obsidian Group took it. Their commander is Anton Varga." },
            new[] { "ROGERS", "Varga. I watched a building fall on him in Sevastopol." },
            new[] { "ORACLE", "Then he walked out of it. An Obsidian ship, the Kestrel Dawn, is docked at Port Varnak. She sails at dawn." },
            new[] { "ROGERS", "Falcon. We go in wet, we go in quiet. Find the warhead and burn that ship to the waterline." },
        };

        void Start() { hud = GetComponent<Hud>(); pl = GameBootstrap.I.Player; StartCoroutine(Run()); }
        void LateUpdate() { TouchInput.ClearTaps(); }

        IEnumerator Say(string who, string text) { hud.Line(who, text); yield return new WaitForSeconds(Mathf.Max(2.5f, text.Length * 0.06f)); }
        IEnumerator Reach(Vector3 p, float r, string obj)
        {
            Objective = obj; Marker = p;
            while (Vector3.Distance(new Vector3(pl.transform.position.x, p.y, pl.transform.position.z), p) > r) yield return null;
            Marker = null;
        }
        IEnumerator KillAll(List<Enemy> list, string obj) { Objective = obj; while (list.Exists(e => e.Alive)) yield return null; }
        static Vector3 V(float x, float y, float z) => new Vector3(x, y, z);

        IEnumerator Run()
        {
            pl.Disabled = true; hud.Bars = true;
            foreach (var l in Briefing) yield return Say(l[0], l[1]);
            hud.Title("QUIET HARBOR", "Port Varnak, Kestrel Strait · Sgt. Rahim \"Falcon\" Durrani · 02:14");
            pl.Disabled = false; hud.Bars = false;

            var sentry = Enemy.Spawn(V(-173, 0, 53), 0);
            var market = new List<Enemy> { sentry,
                Enemy.Spawn(V(-178, 0, 16), 90, new[] { V(-178, 0, 16), V(-140, 0, 16), V(-140, 0, 0), V(-178, 0, 0) }),
                Enemy.Spawn(V(-151, 0, 33), 90), Enemy.Spawn(V(-149, 0, 33), -90) };
            yield return Say("ROGERS", "One sentry on the water's edge. Get behind him and use your knife.");
            Marker = sentry.transform.position + Vector3.up * 2; Objective = "Take out the sentry quietly";
            while (sentry.Alive) yield return null;
            yield return KillAll(market, "Clear the fish market");

            var yard = new List<Enemy>();
            yard.Add(Enemy.Spawn(V(-90, 0, 30), 90, new[] { V(-90, 0, 32), V(-50, 0, 32), V(-50, 0, 12) }));
            yard.Add(Enemy.Spawn(V(-46, 0, -10), 180, new[] { V(-46, 0, -10), V(-46, 0, -50) }));
            yard.Add(Enemy.Spawn(V(-20, 0, 10), 180, new[] { V(-20, 0, 10), V(-20, 0, -36) }));
            yield return Reach(V(18, 0, -37), 5, "Cross the container yard to the harbor master's office");

            yield return Reach(V(20, 4, -44), 2.5f, "Get to the terminal upstairs");
            Objective = "Download the shipping manifests (stand at the terminal)"; Marker = V(41, 4, -48);
            float t = 0; while (t < 10f) { if (Vector3.Distance(pl.transform.position, V(41, 4, -48)) < 2.2f) t += Time.deltaTime; hud.Sub = "Downloading " + Mathf.FloorToInt(t * 10) + "%"; yield return null; }
            hud.Sub = ""; Marker = null;
            yield return Say("ORACLE", "Got it. The Kestrel Dawn's cargo list was edited an hour ago.");
            yield return Say("ROGERS", "Headlights, east road. They knew we were here. Weapons free!");
            var wave = new List<Enemy>(); foreach (var p in new[] { V(70, 0, -60), V(72, 0, -56), V(66, 0, -64), V(74, 0, -66), V(60, 0, -70), V(76, 0, -58) }) { var e = Enemy.Spawn(p, -90); e.Alert(pl.transform.position); wave.Add(e); }
            yield return KillAll(wave, "Defend the office");

            var ware = new List<Enemy>(); foreach (var p in new[] { V(70, 0, -28), V(76, 0, -36), V(82, 0, -22), V(95, 0, -36), V(104, 0, -24) }) ware.Add(Enemy.Spawn(p, -90));
            yield return Reach(V(56, 0, -32), 6, "Push through the warehouse");
            foreach (var e in ware) e.Alert(pl.transform.position);
            yield return KillAll(ware, "Clear the warehouse");
            GetComponent<GameBootstrap>().Player.GetComponent<WeaponSystem>().GiveSniper();
            yield return Say("WHISPER", "Long gun's yours, Falcon. Cover Rogers to the pier gate.");

            var lot = new List<Enemy>(); foreach (var p in new[] { V(84, 0, 8), V(96, 0, 14), V(106, 0, 4), V(96, 0, 30), V(108, 0, 36), V(90, 0, 44) }) { var e = Enemy.Spawn(p, 180); e.Alert(pl.transform.position); lot.Add(e); }
            GameBootstrap.I.Rogers.Hold = V(86, 0, 49);
            yield return KillAll(lot, "Cover Rogers to the pier gate");
            GameBootstrap.I.Rogers.Hold = null;

            var deck = new List<Enemy>(); foreach (var p in new[] { V(60, 7, 120), V(68, 7, 140), V(56, 7, 150), V(64, 7, 175) }) deck.Add(Enemy.Spawn(p, 90));
            yield return Reach(V(80, 0, 140), 5, "Board the Kestrel Dawn");
            foreach (var e in deck) e.Alert(pl.transform.position);
            yield return KillAll(deck, "Clear the deck");
            yield return Say("FALCON", "Rogers. The cradle's empty.");
            yield return Say("ORACLE", "Monsoon went to another ship, the Sable Queen. Varga scuttled her off Kesh Point.");
            yield return Say("ROGERS", "Then we're going swimming. Good work, Falcon.");
            Over = true; Objective = "MISSION COMPLETE"; hud.Title("MISSION COMPLETE", "Next: Act 1 · Mission 2 — Deep Water");
        }

        public void OnPlayerDied() { Objective = "K.I.A. — tap / press R to restart"; StartCoroutine(Restart()); }
        IEnumerator Restart() { yield return new WaitForSeconds(3f); Enemy.All.Clear(); Enemy.Smokes.Clear(); UnityEngine.SceneManagement.SceneManager.LoadScene(0); }
    }
}
