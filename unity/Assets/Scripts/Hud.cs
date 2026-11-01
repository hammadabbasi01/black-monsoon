using UnityEngine;

namespace BlackMonsoon
{
    // IMGUI HUD: objective, compass marker, radio subtitles, ammo, health, hit markers and touch buttons.
    public class Hud : MonoBehaviour
    {
        public bool Bars; public string Sub = "";
        string who = "", text = ""; float lineT, hitT, popT, dmgT, titleT; bool hitKill; string pop = "", titleA = "", titleB = "";
        GUIStyle big, small, mono, btn; AudioSource audioSrc; AudioClip shot, sniper, enemyShot;
        Texture2D white;

        void Awake()
        {
            white = Texture2D.whiteTexture; audioSrc = gameObject.AddComponent<AudioSource>();
            shot = Noise(0.09f, 0.5f, 3500); sniper = Noise(0.6f, 1f, 900); enemyShot = Noise(0.25f, 0.8f, 1600);
        }
        static AudioClip Noise(float len, float vol, float cutoff)
        {
            int n = (int)(44100 * len); var c = AudioClip.Create("shot", n, 1, 44100, false); var d = new float[n]; float lp = 0; float a = Mathf.Clamp01(cutoff / 44100f * 6.28f);
            for (int i = 0; i < n; i++) { lp += a * ((Random.value * 2 - 1) - lp); d[i] = lp * vol * Mathf.Exp(-i / (n * 0.25f)) * 3f; }
            c.SetData(d, 0); return c;
        }
        public void PlayShot(bool loud) => audioSrc.PlayOneShot(loud ? sniper : shot, loud ? 1f : 0.6f);
        public void PlayEnemyShot(Vector3 p) => AudioSource.PlayClipAtPoint(enemyShot, p, 0.9f);
        public void Line(string w, string t) { who = w; text = t; lineT = Mathf.Max(2.5f, t.Length * 0.06f); }
        public void HitMarker(bool kill) { hitT = 0.2f; hitKill = kill; }
        public void Popup(string s) { pop = s; popT = 1.6f; }
        public void DamageFlash(Vector3 from) { dmgT = 0.6f; }
        public void Title(string a, string b) { titleA = a; titleB = b; titleT = 7f; }

        void Update() { lineT -= Time.deltaTime; hitT -= Time.deltaTime; popT -= Time.deltaTime; dmgT -= Time.deltaTime; titleT -= Time.deltaTime; }

        bool Button(Rect r, string label, bool hold = false)
        {
            GUI.color = new Color(1, 1, 1, 0.25f); GUI.DrawTexture(r, white); GUI.color = Color.white; GUI.Label(r, label, btn);
            foreach (var t in Input.touches) { var gp = new Vector2(t.position.x, Screen.height - t.position.y); if (r.Contains(gp) && (hold || t.phase == TouchPhase.Began)) return true; }
            return false;
        }

        void OnGUI()
        {
            float s = Screen.height / 720f;
            if (big == null) { big = new GUIStyle(GUI.skin.label) { fontSize = (int)(34 * s), fontStyle = FontStyle.Bold }; small = new GUIStyle(GUI.skin.label) { fontSize = (int)(20 * s), wordWrap = true }; mono = new GUIStyle(GUI.skin.label) { fontSize = (int)(16 * s) }; btn = new GUIStyle(GUI.skin.label) { fontSize = (int)(15 * s), alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold }; }
            var gb = GameBootstrap.I; var pl = gb.Player; var ws = pl.GetComponent<WeaponSystem>(); var m = gb.Mission;
            if (Bars) { GUI.color = Color.black; GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height * 0.11f), white); GUI.DrawTexture(new Rect(0, Screen.height * 0.89f, Screen.width, Screen.height * 0.11f), white); GUI.color = Color.white; }
            if (pl.Health < 100) { GUI.color = new Color(0.6f, 0, 0, (1 - pl.Health / 100f) * 0.6f + Mathf.Max(0, dmgT) * 0.4f); GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), white); GUI.color = Color.white; }
            if (pl.Underwater) { GUI.color = new Color(0.02f, 0.25f, 0.3f, 0.35f); GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), white); GUI.color = Color.white; }
            GUI.color = new Color(1f, 0.42f, 0.17f); GUI.Label(new Rect(20 * s, 14 * s, 600 * s, 30 * s), "OBJECTIVE", mono); GUI.color = Color.white;
            GUI.Label(new Rect(20 * s, 34 * s, 520 * s, 60 * s), m != null ? m.Objective : "", small);
            if (Sub != "") GUI.Label(new Rect(20 * s, 84 * s, 520 * s, 30 * s), Sub, mono);
            if (lineT > 0) { GUI.color = new Color(0, 0, 0, 0.6f); GUI.DrawTexture(new Rect(Screen.width * 0.2f, Screen.height - 130 * s, Screen.width * 0.6f, 70 * s), white); GUI.color = new Color(1f, 0.7f, 0.5f); GUI.Label(new Rect(Screen.width * 0.21f, Screen.height - 126 * s, 200 * s, 24 * s), who, mono); GUI.color = Color.white; GUI.Label(new Rect(Screen.width * 0.21f, Screen.height - 104 * s, Screen.width * 0.58f, 50 * s), text, small); }
            if (titleT > 0) { GUI.color = new Color(1f, 0.42f, 0.17f, Mathf.Clamp01(titleT)); GUI.Label(new Rect(30 * s, Screen.height * 0.55f, 900 * s, 50 * s), titleA, big); GUI.color = new Color(1, 1, 1, Mathf.Clamp01(titleT)); GUI.Label(new Rect(30 * s, Screen.height * 0.55f + 44 * s, 900 * s, 30 * s), titleB, mono); GUI.color = Color.white; }
            if (ws != null && !(ws.CurrentScope && ws.Ads > 0.85f)) { GUI.Label(new Rect(Screen.width / 2f - 6, Screen.height / 2f - 12, 20, 24), "+", small); }
            if (ws != null && ws.CurrentScope && ws.Ads > 0.85f) { GUI.color = Color.black; float r = Screen.height * 0.42f; GUI.DrawTexture(new Rect(0, 0, Screen.width / 2f - r, Screen.height), white); GUI.DrawTexture(new Rect(Screen.width / 2f + r, 0, Screen.width / 2f - r, Screen.height), white); GUI.DrawTexture(new Rect(Screen.width / 2f - 1, 0, 2, Screen.height), white); GUI.DrawTexture(new Rect(0, Screen.height / 2f - 1, Screen.width, 2), white); GUI.color = Color.white; }
            if (hitT > 0) { GUI.color = hitKill ? new Color(1f, 0.3f, 0.2f) : Color.white; GUI.Label(new Rect(Screen.width / 2f - 10, Screen.height / 2f - 14, 30, 30), "X", small); GUI.color = Color.white; }
            if (popT > 0) GUI.Label(new Rect(Screen.width / 2f - 150 * s, Screen.height * 0.3f, 300 * s, 40 * s), pop, big);
            if (ws != null) { GUI.Label(new Rect(Screen.width - 260 * s, 14 * s, 240 * s, 24 * s), ws.Label, mono); GUI.Label(new Rect(Screen.width - 260 * s, 34 * s, 240 * s, 40 * s), ws.MagAmmo + " / " + ws.Reserve, big); GUI.Label(new Rect(Screen.width - 260 * s, 76 * s, 240 * s, 24 * s), "FRAG x" + ws.Frags + "  SMOKE x" + ws.Smokes, mono); }
            if (m != null && m.Marker.HasValue) { var v = pl.Cam.WorldToScreenPoint(m.Marker.Value); if (v.z > 0) { GUI.color = new Color(1f, 0.42f, 0.17f); GUI.Label(new Rect(v.x - 40, Screen.height - v.y - 12, 120, 24), "◆ " + Mathf.RoundToInt(Vector3.Distance(pl.transform.position, m.Marker.Value)) + "m", mono); GUI.color = Color.white; } }
            if (pl.Underwater || pl.Oxygen < 0.99f) { GUI.color = new Color(0.4f, 0.8f, 1f); GUI.DrawTexture(new Rect(Screen.width / 2f - 90 * s, Screen.height - 160 * s, 180 * s * pl.Oxygen, 5 * s), white); GUI.color = Color.white; }

            if (!TouchInput.Active || Event.current.type != EventType.Repaint) return;
            float b = 74 * s, R = Screen.width, Bt = Screen.height;
            var rFire = new Rect(R - b * 1.4f - 20 * s, Bt - b * 1.4f - 20 * s, b * 1.4f, b * 1.4f); var rAds = new Rect(rFire.x - b - 14 * s, Bt - b - 30 * s, b, b);
            var rRel = new Rect(R - b - 30 * s, rFire.y - b - 12 * s, b, b); var rJump = new Rect(rAds.x - b - 14 * s, Bt - b - 30 * s, b, b);
            var rNade = new Rect(rRel.x - b - 14 * s, rRel.y, b, b); var rSmoke = new Rect(rNade.x - b - 14 * s, rRel.y, b, b);
            var rKnife = new Rect(rRel.x, rRel.y - b - 12 * s, b, b); var rSwap = new Rect(rNade.x, rKnife.y, b, b); var rCrouch = new Rect(rSmoke.x, rKnife.y, b, b);
            TouchInput.ButtonRects = new[] { rFire, rAds, rRel, rJump, rNade, rSmoke, rKnife, rSwap, rCrouch };
            TouchInput.Fire = Button(rFire, "FIRE", true);
            if (Button(rAds, "AIM")) TouchInput.Aim = !TouchInput.Aim;
            if (Button(rRel, "RELOAD")) TouchInput.ReloadTap = true;
            if (Button(rJump, "JUMP")) TouchInput.JumpTap = true;
            if (Button(rNade, "FRAG")) TouchInput.NadeTap = true;
            if (Button(rSmoke, "SMOKE")) TouchInput.SmokeTap = true;
            if (Button(rKnife, "KNIFE")) TouchInput.KnifeTap = true;
            if (Button(rSwap, "SWAP")) TouchInput.SwapTap = true;
            if (Button(rCrouch, "CROUCH")) TouchInput.CrouchTap = true;
        }
    }
}
