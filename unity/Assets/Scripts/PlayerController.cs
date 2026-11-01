using UnityEngine;

namespace BlackMonsoon
{
    // First-person controller: walk / sprint / crouch / jump, CoD-style health regen, swimming with oxygen.
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        public Camera Cam;
        public float Health = 100f, Oxygen = 1f;
        public bool Crouching, Swimming, Underwater, Dead, Disabled;
        public float Speed01;
        CharacterController cc; float yaw = 90f, pitch, vy, lastHurt = -10f, baseFov = 70f, recoil;
        public bool God;

        void Awake()
        {
            cc = GetComponent<CharacterController>(); cc.height = 1.8f; cc.radius = 0.32f; cc.center = new Vector3(0, 0.9f, 0); cc.stepOffset = 0.5f; cc.slopeLimit = 50f;
            var cg = new GameObject("Camera"); cg.transform.SetParent(transform); cg.transform.localPosition = new Vector3(0, 1.62f, 0);
            Cam = cg.AddComponent<Camera>(); Cam.nearClipPlane = 0.05f; Cam.farClipPlane = 900f; Cam.fieldOfView = baseFov;
            Cam.backgroundColor = RenderSettings.fogColor; Cam.clearFlags = CameraClearFlags.SolidColor;
            cg.AddComponent<AudioListener>(); cg.tag = "MainCamera";
            var torch = new GameObject("Torch").AddComponent<Light>(); torch.transform.SetParent(cg.transform, false);
            torch.type = LightType.Spot; torch.range = 35; torch.spotAngle = 45; torch.intensity = 0; torch.name = "Torch";
            if (!TouchInput.Active) { Cursor.lockState = CursorLockMode.Locked; Cursor.visible = false; }
        }

        public void AddRecoil(float r) { recoil += r; }
        public void Hurt(float dmg, Vector3 from)
        {
            if (Dead || God) return;
            Health -= dmg; lastHurt = Time.time;
            GameBootstrap.I.Hud.DamageFlash(from);
            if (Health <= 0) { Health = 0; Dead = true; GameBootstrap.I.Mission.OnPlayerDied(); }
        }
        public void Teleport(Vector3 p, float yawDeg) { cc.enabled = false; transform.position = p; yaw = yawDeg; cc.enabled = true; vy = 0; }

        void Update()
        {
            TouchInput.Update();
            if (Time.time - lastHurt > 4f && Health < 100f && !Dead) Health = Mathf.Min(100f, Health + 28f * Time.deltaTime);
            var ws = GetComponent<WeaponSystem>();
            float adsSlow = ws != null ? Mathf.Lerp(1f, ws.CurrentScope ? 0.2f : 0.6f, ws.Ads) : 1f;
            Vector2 look = TouchInput.Active ? TouchInput.Look : new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")) * 2.2f;
            if (!Disabled) { yaw += look.x * adsSlow; pitch -= look.y * adsSlow; }
            pitch -= recoil; recoil = Mathf.Lerp(recoil, 0, Time.deltaTime * 14f);
            pitch = Mathf.Clamp(pitch, -85f, 85f);
            transform.rotation = Quaternion.Euler(0, yaw, 0);
            Cam.transform.localRotation = Quaternion.Euler(pitch, 0, 0);

            Vector2 mv = Disabled ? Vector2.zero : (TouchInput.Active ? TouchInput.Move : new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical")));
            bool sprint = !Disabled && (TouchInput.Active ? TouchInput.Sprint : Input.GetKey(KeyCode.LeftShift)) && mv.y > 0.3f && !Crouching;
            if (Input.GetKeyDown(KeyCode.C) || TouchInput.CrouchTap) Crouching = !Crouching;

            float seaLevel = GameBootstrap.I.SeaLevel;
            Swimming = transform.position.y + 1.15f < seaLevel && IsSea(transform.position);
            Underwater = Cam.transform.position.y < seaLevel && IsSea(transform.position);
            if (Underwater) { Oxygen -= Time.deltaTime / 32f; if (Oxygen <= 0) { Oxygen = 0; Hurt(14f * Time.deltaTime, transform.position); } }
            else Oxygen = Mathf.Min(1f, Oxygen + Time.deltaTime * 0.5f);
            RenderSettings.fogColor = Underwater ? new Color(0.04f, 0.2f, 0.25f) : new Color(0.05f, 0.07f, 0.09f);
            RenderSettings.fogDensity = Underwater ? 0.07f : 0.012f; Cam.backgroundColor = RenderSettings.fogColor;

            Vector3 wish = transform.right * mv.x + transform.forward * mv.y;
            float speed = Swimming ? 3f : Crouching ? 2f : sprint ? 6.6f : 3.7f;
            if (ws != null) speed *= Mathf.Lerp(1f, 0.6f, ws.Ads);
            if (Swimming)
            {
                var lookDir = Cam.transform.forward;
                wish = (Underwater ? lookDir * mv.y : transform.forward * mv.y) + transform.right * mv.x;
                float up = (Input.GetKey(KeyCode.Space) || TouchInput.JumpTap) ? 1f : Crouching ? -1f : 0.25f;
                vy = Mathf.Lerp(vy, up * 2f, Time.deltaTime * 2f);
                if (transform.position.y > seaLevel - 1.5f && vy > 0) vy = 0;
                cc.Move((wish * speed + Vector3.up * vy) * Time.deltaTime);
            }
            else
            {
                if (cc.isGrounded) { vy = -1f; if (!Disabled && (Input.GetKeyDown(KeyCode.Space) || TouchInput.JumpTap)) { if (Crouching) Crouching = false; else vy = 5.2f; } }
                vy -= 16f * Time.deltaTime;
                cc.Move((wish * speed + Vector3.up * vy) * Time.deltaTime);
            }
            cc.height = Mathf.Lerp(cc.height, Crouching ? 1.15f : 1.8f, Time.deltaTime * 10f); cc.center = new Vector3(0, cc.height / 2f, 0);
            Speed01 = Mathf.Clamp01(new Vector3(cc.velocity.x, 0, cc.velocity.z).magnitude / 3.7f);
            float bob = cc.isGrounded ? Mathf.Sin(Time.time * (sprint ? 13 : 9)) * 0.035f * Speed01 : 0f;
            Cam.transform.localPosition = new Vector3(0, (Swimming ? 1.5f : Crouching ? 1.0f : 1.62f) + bob, 0);
            float fov = baseFov + (sprint ? 6 : 0); if (ws != null) fov = Mathf.Lerp(fov, ws.AdsFov, ws.Ads);
            Cam.fieldOfView = Mathf.Lerp(Cam.fieldOfView, fov, Time.deltaTime * 14f);
            if (Input.GetKeyDown(KeyCode.F)) { var t = Cam.transform.Find("Torch").GetComponent<Light>(); t.intensity = t.intensity > 0 ? 0 : 3f; }
        }
        public static bool IsSea(Vector3 p) { if (p.x > 78 && p.x < 100 && p.z < 216) return false; return p.z > 60 || p.x < -190; }
    }
}
