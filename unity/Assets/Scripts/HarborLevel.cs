using System.Collections.Generic;
using UnityEngine;

namespace BlackMonsoon
{
    // Block-out of Port Varnak (same layout as the web build): seawall, fish market, container yard,
    // harbor master's office, warehouse, pier 4 and the Kestrel Dawn.
    public static class HarborLevel
    {
        static Transform root;
        static readonly Dictionary<string, Material> mats = new Dictionary<string, Material>();
        public static readonly List<Vector3> LampPositions = new List<Vector3>();

        static Material Mat(string key, Color c, float smooth = 0.2f, float metal = 0f, bool emissive = false)
        {
            if (mats.TryGetValue(key, out var m)) return m;
            var tmp = GameObject.CreatePrimitive(PrimitiveType.Cube);
            m = new Material(tmp.GetComponent<Renderer>().sharedMaterial);
            Object.Destroy(tmp);
            m.color = c; m.SetFloat("_Glossiness", smooth); m.SetFloat("_Metallic", metal);
            if (emissive) { m.EnableKeyword("_EMISSION"); m.SetColor("_EmissionColor", c * 3f); }
            mats[key] = m; return m;
        }

        public static GameObject Box(Vector3 center, Vector3 size, string mat, Color c, float rotY = 0f, float smooth = 0.2f, float metal = 0f)
        {
            var g = GameObject.CreatePrimitive(PrimitiveType.Cube);
            g.transform.SetParent(root); g.transform.position = center; g.transform.localScale = size;
            g.transform.rotation = Quaternion.Euler(0, rotY, 0);
            g.GetComponent<Renderer>().sharedMaterial = Mat(mat, c, smooth, metal);
            g.isStatic = true;
            return g;
        }
        // base-anchored box (y = bottom)
        static GameObject B(float x, float y, float z, float w, float h, float d, string mat, Color c, float rot = 0, float smooth = 0.2f, float metal = 0f)
            => Box(new Vector3(x, y + h / 2f, z), new Vector3(w, h, d), mat, c, rot, smooth, metal);

        static void Lamp(float x, float z, float h, Color col, float range = 22f, float intensity = 2.2f)
        {
            B(x, 0, z, 0.2f, h, 0.2f, "steel", new Color(0.3f, 0.32f, 0.34f), 0, 0.5f, 0.8f);
            var bulb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Object.Destroy(bulb.GetComponent<Collider>());
            bulb.transform.SetParent(root); bulb.transform.position = new Vector3(x, h, z); bulb.transform.localScale = Vector3.one * 0.5f;
            bulb.GetComponent<Renderer>().sharedMaterial = Mat("lamp" + col, col, 0.5f, 0, true);
            var l = new GameObject("Lamp").AddComponent<Light>();
            l.transform.SetParent(root); l.transform.position = new Vector3(x, h - 0.4f, z);
            l.type = LightType.Point; l.color = col; l.range = range; l.intensity = intensity; l.shadows = LightShadows.None;
            LampPositions.Add(l.transform.position);
        }

        static void Container(float x, float y, float z, float rot, Color c) => B(x, y, z, 2.44f, 2.6f, 12.2f, "cont" + c, c, rot, 0.3f, 0.4f);

        public static void Build(Transform parent)
        {
            root = new GameObject("Level").transform; root.SetParent(parent);
            var rnd = new System.Random(1337);
            Color warm = new Color(1f, 0.72f, 0.4f), cold = new Color(0.75f, 0.88f, 1f), red = new Color(1f, 0.15f, 0.1f);
            Color asphalt = new Color(0.13f, 0.13f, 0.14f), concrete = new Color(0.42f, 0.42f, 0.4f), corr = new Color(0.36f, 0.38f, 0.38f);

            // land, quay walls, sea
            B(0, -0.3f, -50, 380, 0.3f, 220, "asphalt", asphalt, 0, 0.55f);
            B(0, -9, 60.5f, 380, 9.15f, 1.2f, "concrete", concrete);
            B(-190.5f, -9, -50, 1.2f, 9.15f, 221, "concrete", concrete);
            var sea = GameObject.CreatePrimitive(PrimitiveType.Plane);
            Object.Destroy(sea.GetComponent<Collider>());
            sea.transform.SetParent(root); sea.transform.position = new Vector3(0, GameBootstrap.I.SeaLevel, 0); sea.transform.localScale = new Vector3(240, 1, 240);
            sea.GetComponent<Renderer>().sharedMaterial = Mat("sea", new Color(0.03f, 0.09f, 0.11f), 0.95f, 0.2f);
            B(0, -9.5f, 0, 2400, 0.5f, 2400, "seabed", new Color(0.18f, 0.22f, 0.2f));

            // fish market sheds + stalls
            B(-176, 0, -25, 12, 4.5f, 10, "corr", corr); B(-155, 0, -27, 14, 5, 12, "corr", corr); B(-134, 0, -28, 16, 6, 20, "panel", new Color(0.55f, 0.55f, 0.52f));
            for (int i = 0; i < 5; i++) { B(-178 + i * 7.5f, 0, 6, 3f, 0.9f, 1.2f, "wood", new Color(0.35f, 0.25f, 0.17f)); B(-178 + i * 7.5f, 2.3f, 6, 3.6f, 0.06f, 2.4f, "tarp", new Color(0.17f, 0.29f, 0.21f)); }
            Lamp(-178, 47, 7.5f, warm); Lamp(-158, 47, 7.5f, warm); Lamp(-138, 47, 7.5f, warm); Lamp(-160, -6, 7.5f, warm);

            // watch tower
            foreach (var p in new[] { new Vector2(-112, 10), new Vector2(-108, 10), new Vector2(-112, 14), new Vector2(-108, 14) }) B(p.x, 0, p.y, 0.3f, 8, 0.3f, "steel", new Color(0.3f, 0.32f, 0.34f), 0, 0.5f, 0.8f);
            B(-110, 7.8f, 12, 5.2f, 0.25f, 5.2f, "wood", new Color(0.35f, 0.25f, 0.17f));

            // container yard
            for (int ci = 0; ci < 12; ci++)
            {
                float cx = -95 + ci * 8.2f; if (Mathf.Abs(cx + 46) < 4) continue;
                foreach (float cz in new float[] { 22, 0, -24, -46, -70, -92, -114 })
                {
                    if (cz == -24 && ci % 3 != 0) continue;
                    if (rnd.NextDouble() < 0.16) continue;
                    int lv = 1 + rnd.Next(3);
                    var col = Color.HSVToRGB((float)rnd.NextDouble(), 0.45f, 0.35f);
                    for (int i = 0; i < lv; i++) { Container(cx - 1.25f, i * 2.6f, cz, 0, col); Container(cx + 1.25f, i * 2.6f, cz, 0, col); }
                }
            }
            foreach (var p in new[] { new Vector2(-72, -12), new Vector2(-20, -12), new Vector2(-72, -82), new Vector2(-20, -82) }) Lamp(p.x, p.y, 18, cold, 45, 3.5f);

            // harbor master's office (two floors, exterior stairs)
            B(33, 0, -52, 22, 8, 0.3f, "panel", new Color(0.6f, 0.6f, 0.57f)); B(33, 0, -38, 22, 8, 0.3f, "panel", new Color(0.6f, 0.6f, 0.57f));
            B(44, 0, -45, 0.3f, 8, 14, "panel", new Color(0.6f, 0.6f, 0.57f)); B(22, 0, -48.5f, 0.3f, 8, 7, "panel", new Color(0.6f, 0.6f, 0.57f)); B(22, 0, -40, 0.3f, 4, 4, "panel", new Color(0.6f, 0.6f, 0.57f));
            B(33, 3.7f, -45, 22, 0.3f, 14, "floor", new Color(0.5f, 0.5f, 0.48f)); B(33, 8, -45, 22.6f, 0.35f, 14.6f, "concrete", concrete);
            for (int i = 0; i < 19; i++) B(20.1f, 0, -36.35f - i * 0.3f, 2.2f, 0.21f * (i + 1), 0.3f, "concrete", concrete);
            B(20.1f, 3.7f, -43.9f, 2.2f, 0.3f, 3.6f, "concrete", concrete);
            B(42.2f, 4, -48, 1.4f, 0.8f, 2.2f, "terminal", new Color(0.1f, 0.12f, 0.13f));
            Lamp(18, -30, 8, warm); Lamp(48, -34, 8, warm);

            // warehouse
            B(83, 0, -48, 50, 12, 0.3f, "corr", corr); B(83, 0, -16, 50, 12, 0.3f, "corr", corr);
            B(58, 0, -41.7f, 0.3f, 12, 12.6f, "corr", corr); B(58, 0, -21.7f, 0.3f, 12, 11.4f, "corr", corr); B(58, 6, -31.7f, 0.3f, 6, 8.6f, "corr", corr);
            B(108, 0, -41.7f, 0.3f, 12, 12.6f, "corr", corr); B(108, 0, -21.7f, 0.3f, 12, 11.4f, "corr", corr); B(108, 6, -31.7f, 0.3f, 6, 8.6f, "corr", corr);
            B(83, 12, -32, 50.6f, 0.35f, 32.6f, "corr", corr);
            foreach (var p in new[] { new Vector2(68, -30), new Vector2(83, -30), new Vector2(98, -30) }) Lamp(p.x, p.y, 11.5f, warm, 24, 2.5f);

            // pier 4 + ship
            B(89, -0.6f, 138, 22, 0.6f, 156, "concrete", concrete); B(89, -9, 138, 21.6f, 8.4f, 154, "concrete", concrete);
            for (float z = 70; z < 214; z += 22) Lamp(98.5f, z, 9, cold);
            Color hull = new Color(0.16f, 0.19f, 0.22f), deck = new Color(0.3f, 0.31f, 0.3f);
            B(50.3f, -6, 140, 0.6f, 14, 130, "hull", hull, 0, 0.4f, 0.4f); B(73.7f, -6, 140, 0.6f, 13, 130, "hull", hull, 0, 0.4f, 0.4f); B(62, -6, 75.3f, 24, 14, 0.6f, "hull", hull);
            B(62, 6.6f, 140, 23, 0.4f, 130, "deck", deck, 0, 0.5f, 0.5f);
            B(62, 7, 86, 20, 12, 18, "white", new Color(0.72f, 0.72f, 0.69f));
            for (int i = 0; i < 32; i++) B(85.5f - (i + 0.5f) * 0.378f, (i + 1) * 0.219f - 0.12f, 140, 0.4f, 0.12f, 1.6f, "steel", new Color(0.3f, 0.32f, 0.34f), 0, 0.5f, 0.8f);
            foreach (var p in new[] { new Vector2(52, 100), new Vector2(72, 128), new Vector2(52, 180) }) Lamp(p.x, p.y, 12, cold, 20, 2f);
            Lamp(62, 116, 5.4f, red, 14, 2f);
        }
    }
}
