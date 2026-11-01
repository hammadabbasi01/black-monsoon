using UnityEngine;

namespace BlackMonsoon
{
    // Entry point: builds lighting, the harbor level, the squad and the Act 1 Mission 1 script entirely from code.
    public class GameBootstrap : MonoBehaviour
    {
        public static GameBootstrap I;
        public PlayerController Player;
        public Ally Rogers;
        public Hud Hud;
        public Mission1 Mission;
        public float SeaLevel = -1.4f;

        void Awake()
        {
            I = this;
            Application.targetFrameRate = 60;
            QualitySettings.shadowDistance = 60f;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;

            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.012f;
            RenderSettings.fogColor = new Color(0.05f, 0.07f, 0.09f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.22f, 0.28f, 0.36f);
            RenderSettings.ambientEquatorColor = new Color(0.12f, 0.13f, 0.15f);
            RenderSettings.ambientGroundColor = new Color(0.05f, 0.04f, 0.03f);

            var moon = new GameObject("Moon").AddComponent<Light>();
            moon.type = LightType.Directional; moon.color = new Color(0.62f, 0.72f, 0.85f); moon.intensity = 0.35f;
            moon.shadows = LightShadows.Soft; moon.transform.rotation = Quaternion.Euler(50, -30, 0);

            HarborLevel.Build(transform);

            var pgo = new GameObject("Falcon");
            pgo.transform.position = new Vector3(-189f, 0.2f, 34f);
            Player = pgo.AddComponent<PlayerController>();
            pgo.AddComponent<WeaponSystem>();

            Rogers = Ally.Spawn(new Vector3(-187f, 0.1f, 36f));
            Hud = gameObject.AddComponent<Hud>();
            Mission = gameObject.AddComponent<Mission1>();
        }
    }
}
