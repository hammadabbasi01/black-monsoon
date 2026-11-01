using System.Collections;
using UnityEngine;

namespace BlackMonsoon
{
    // Hitscan weapons (pistol / carbine / sniper), knife, frag and smoke grenades, with a simple block viewmodel.
    public class WeaponSystem : MonoBehaviour
    {
        class Gun { public string Name; public int Mag, Ammo, Reserve; public float Rpm, Dmg, Spread, AdsSpread, AdsFov, Recoil, Reload; public bool Auto, Scope, Owned; public GameObject Model; }
        Gun[] guns; int cur = 1; float cool, reloadT, swapT; bool lastTrigger;
        public float Ads; public int Frags = 3, Smokes = 2;
        public bool CurrentScope => guns[cur].Scope;
        public float AdsFov => guns[cur].AdsFov;
        public string Label => guns[cur].Name;
        public int MagAmmo => guns[cur].Ammo; public int Reserve => guns[cur].Reserve;
        PlayerController pc; Light flash; Transform vm;

        void Start()
        {
            pc = GetComponent<PlayerController>();
            guns = new[] {
                new Gun { Name = "MK-4 Carbine SD", Mag = 30, Reserve = 180, Rpm = 750, Dmg = 34, Spread = 0.022f, AdsSpread = 0.002f, AdsFov = 50, Recoil = 0.7f, Reload = 2.1f, Auto = true, Owned = true },
                new Gun { Name = "P-9 Suppressed", Mag = 15, Reserve = 75, Rpm = 420, Dmg = 48, Spread = 0.018f, AdsSpread = 0.004f, AdsFov = 58, Recoil = 1.1f, Reload = 1.5f, Owned = true },
                new Gun { Name = "R-338 Longbow", Mag = 5, Reserve = 30, Rpm = 48, Dmg = 320, Spread = 0.06f, AdsSpread = 0.0005f, AdsFov = 13, Recoil = 3f, Reload = 2.8f, Scope = true, Owned = false },
            };
            foreach (var g in guns) g.Ammo = g.Mag;
            vm = new GameObject("Viewmodel").transform; vm.SetParent(pc.Cam.transform, false);
            for (int i = 0; i < guns.Length; i++) guns[i].Model = BuildModel(i);
            flash = new GameObject("MuzzleFlash").AddComponent<Light>(); flash.transform.SetParent(vm, false); flash.transform.localPosition = new Vector3(0, 0, 0.7f);
            flash.type = LightType.Point; flash.color = new Color(1f, 0.7f, 0.4f); flash.range = 8; flash.intensity = 0;
            Show();
        }
        GameObject BuildModel(int i)
        {
            var root = new GameObject("Gun" + i); root.transform.SetParent(vm, false);
            Color dark = new Color(0.12f, 0.13f, 0.14f), tan = new Color(0.45f, 0.38f, 0.28f);
            void Part(Vector3 p, Vector3 s, Color c) { var g = GameObject.CreatePrimitive(PrimitiveType.Cube); Destroy(g.GetComponent<Collider>()); g.transform.SetParent(root.transform, false); g.transform.localPosition = p; g.transform.localScale = s; var r = g.GetComponent<Renderer>(); r.material.color = c; r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; }
            if (i == 1) { Part(new Vector3(0, 0.01f, 0.05f), new Vector3(0.032f, 0.034f, 0.19f), dark); Part(new Vector3(0, -0.06f, -0.03f), new Vector3(0.03f, 0.11f, 0.045f), dark); Part(new Vector3(0, 0.01f, 0.2f), new Vector3(0.03f, 0.03f, 0.15f), dark); }
            else
            {
                float L = i == 2 ? 1.3f : 1f;
                Part(new Vector3(0, 0, 0), new Vector3(0.05f, 0.065f, 0.3f), dark); Part(new Vector3(0, 0, 0.27f * L), new Vector3(0.054f, 0.058f, 0.24f * L), i == 2 ? tan : dark);
                Part(new Vector3(0, 0.004f, 0.55f * L), new Vector3(0.04f, 0.04f, 0.2f * L), dark); Part(new Vector3(0, -0.1f, 0.05f), new Vector3(0.03f, 0.15f, 0.07f), dark);
                Part(new Vector3(0, -0.01f, -0.25f), new Vector3(0.045f, 0.06f, 0.2f), tan);
                if (i == 2) Part(new Vector3(0, 0.08f, 0.04f), new Vector3(0.045f, 0.045f, 0.34f), dark); else Part(new Vector3(0, 0.07f, 0.02f), new Vector3(0.045f, 0.04f, 0.07f), dark);
            }
            Part(new Vector3(0.0f, -0.08f, -0.1f), new Vector3(0.075f, 0.05f, 0.1f), new Color(0.25f, 0.27f, 0.22f)); // glove
            return root;
        }
        void Show() { for (int i = 0; i < guns.Length; i++) guns[i].Model.SetActive(i == cur); }
        public void GiveSniper() { guns[2].Owned = true; guns[2].Ammo = 5; cur = 2; Show(); }
        void Swap() { int n = cur; do { n = (n + 1) % guns.Length; } while (!guns[n].Owned); if (n != cur) { cur = n; swapT = 0.45f; Show(); } }

        void Update()
        {
            if (pc.Dead || pc.Disabled) return;
            var g = guns[cur];
            cool -= Time.deltaTime; swapT -= Time.deltaTime;
            bool touch = TouchInput.Active;
            if (Input.GetKeyDown(KeyCode.Q) || TouchInput.SwapTap || Input.mouseScrollDelta.y != 0) Swap();
            if ((Input.GetKeyDown(KeyCode.R) || TouchInput.ReloadTap) && g.Ammo < g.Mag && g.Reserve > 0 && reloadT <= 0) reloadT = g.Reload;
            if (reloadT > 0) { reloadT -= Time.deltaTime; if (reloadT <= 0) { int n = Mathf.Min(g.Mag - g.Ammo, g.Reserve); g.Ammo += n; g.Reserve -= n; } }
            bool wantAds = (touch ? TouchInput.Aim : Input.GetMouseButton(1)) && reloadT <= 0;
            Ads = Mathf.MoveTowards(Ads, wantAds ? 1 : 0, Time.deltaTime * 7f);
            bool trig = touch ? TouchInput.Fire : Input.GetMouseButton(0);
            if (trig && cool <= 0 && reloadT <= 0 && swapT <= 0 && (g.Auto || !lastTrigger))
            {
                if (g.Ammo > 0) Fire(g); else if (g.Reserve > 0) reloadT = g.Reload;
            }
            lastTrigger = trig;
            if (Input.GetKeyDown(KeyCode.V) || TouchInput.KnifeTap) Knife();
            if ((Input.GetKeyDown(KeyCode.G) || TouchInput.NadeTap) && Frags > 0) { Frags--; Throw(false); }
            if ((Input.GetKeyDown(KeyCode.T) || TouchInput.SmokeTap) && Smokes > 0) { Smokes--; Throw(true); }
            // viewmodel pose
            Vector3 hip = new Vector3(0.16f, -0.14f, 0.38f), ads = new Vector3(0, g.Scope ? -0.09f : -0.075f, 0.3f);
            vm.localPosition = Vector3.Lerp(hip, ads, Ads) + new Vector3(0, -Mathf.Abs(Mathf.Sin(Time.time * 9f)) * 0.012f * pc.Speed01, -Mathf.Max(0, cool) * 0.3f);
            vm.localRotation = Quaternion.Euler(reloadT > 0 ? 30 : 0, Mathf.Lerp(-4, 0, Ads), reloadT > 0 ? -25 : 0);
            vm.gameObject.SetActive(!(g.Scope && Ads > 0.85f) && !pc.Swimming);
            flash.intensity = Mathf.MoveTowards(flash.intensity, 0, Time.deltaTime * 80f);
        }

        void Fire(Gun g)
        {
            g.Ammo--; cool = 60f / g.Rpm;
            var cam = pc.Cam.transform; float sp = Mathf.Lerp(g.Spread, g.AdsSpread, Ads) * (1f + pc.Speed01);
            var dir = (cam.forward + Random.insideUnitSphere * sp).normalized;
            pc.AddRecoil(g.Recoil * (1f - Ads * 0.45f));
            flash.intensity = g == guns[2] ? 8 : 3;
            GameBootstrap.I.Hud.PlayShot(g == guns[2]);
            if (g != guns[2]) Enemy.AlertAll(transform.position, 8f); else Enemy.AlertAll(transform.position, 90f);
            if (Physics.Raycast(cam.position, dir, out var hit, 600f))
            {
                var e = hit.collider.GetComponentInParent<Enemy>();
                if (e != null) { bool head = hit.point.y > e.transform.position.y + 1.5f; bool killed = e.Hurt(g.Dmg * (head ? 2.5f : 1f)); GameBootstrap.I.Hud.HitMarker(killed); }
                StartCoroutine(Tracer(vm.position + vm.forward * 0.6f, hit.point));
            }
        }
        void Knife()
        {
            foreach (var e in Enemy.All) if (e.Alive && Vector3.Distance(e.transform.position, transform.position) < 2.4f && Vector3.Dot((e.transform.position - transform.position).normalized, transform.forward) > 0.5f) { e.Hurt(999); GameBootstrap.I.Hud.Popup("SILENT TAKEDOWN"); return; }
        }
        void Throw(bool smoke)
        {
            var n = GameObject.CreatePrimitive(PrimitiveType.Sphere); n.transform.localScale = Vector3.one * 0.12f; n.transform.position = pc.Cam.transform.position + pc.Cam.transform.forward * 0.6f;
            var rb = n.AddComponent<Rigidbody>(); rb.mass = 0.4f; rb.velocity = (pc.Cam.transform.forward + Vector3.up * 0.2f).normalized * 17f;
            StartCoroutine(Fuse(n, smoke));
        }
        IEnumerator Fuse(GameObject n, bool smoke)
        {
            yield return new WaitForSeconds(smoke ? 1.6f : 3f);
            var p = n.transform.position; Destroy(n);
            var fx = new GameObject(smoke ? "Smoke" : "Explosion"); fx.transform.position = p;
            var ps = fx.AddComponent<ParticleSystem>(); ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear); var main = ps.main; main.startLifetime = smoke ? 8f : 1.2f; main.startSize = smoke ? 5f : 3f; main.startSpeed = smoke ? 0.6f : 6f;
            main.startColor = smoke ? new Color(0.6f, 0.62f, 0.64f, 0.6f) : new Color(1f, 0.55f, 0.2f, 1f); main.loop = false; main.duration = smoke ? 10f : 0.3f;
            var em = ps.emission; em.rateOverTime = smoke ? 25 : 0; if (!smoke) em.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)60) });
            var ren = fx.GetComponent<ParticleSystemRenderer>(); ren.material = new Material(Shader.Find("Sprites/Default"));
            ps.Play(); Destroy(fx, smoke ? 20f : 3f);
            if (smoke) { Enemy.Smokes.Add(new Vector4(p.x, p.y, p.z, 7f)); yield break; }
            var l = fx.AddComponent<Light>(); l.color = new Color(1f, 0.6f, 0.3f); l.range = 30; l.intensity = 8;
            foreach (var e in Enemy.All) if (e.Alive && Vector3.Distance(e.transform.position, p) < 7.5f) e.Hurt(260f * (1f - Vector3.Distance(e.transform.position, p) / 7.5f) + 20f);
            float pd = Vector3.Distance(transform.position, p); if (pd < 7.5f) pc.Hurt(120f * (1f - pd / 7.5f), p);
            Enemy.AlertAll(p, 120f);
        }
        IEnumerator Tracer(Vector3 a, Vector3 b)
        {
            var go = new GameObject("Tracer"); var lr = go.AddComponent<LineRenderer>(); lr.positionCount = 2; lr.SetPosition(0, a); lr.SetPosition(1, b);
            lr.startWidth = lr.endWidth = 0.02f; lr.material = new Material(Shader.Find("Sprites/Default")); lr.startColor = lr.endColor = new Color(1f, 0.8f, 0.5f, 0.8f);
            yield return new WaitForSeconds(0.05f); Destroy(go);
        }
    }
}
