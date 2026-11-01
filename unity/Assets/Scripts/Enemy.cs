using System.Collections.Generic;
using UnityEngine;

namespace BlackMonsoon
{
    // Obsidian soldier: idle / patrol / combat with sight cone, hearing, smoke-blocked vision and burst fire.
    public class Enemy : MonoBehaviour
    {
        public static readonly List<Enemy> All = new List<Enemy>();
        public static readonly List<Vector4> Smokes = new List<Vector4>();
        public float Hp = 100f; public bool Alive = true, Combat, Dormant;
        public Vector3[] Patrol; int pi; float wait, think, burstT, aimT, detect; int burst;
        Vector3 lastKnown; float lastSeen = -99f;
        public System.Action<Enemy> OnDeath;
        Transform gun;

        public static Enemy Spawn(Vector3 pos, float yaw, Vector3[] patrol = null, bool dormant = false)
        {
            var go = new GameObject("Obsidian");
            go.transform.position = pos; go.transform.rotation = Quaternion.Euler(0, yaw, 0);
            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule); body.transform.SetParent(go.transform, false); body.transform.localPosition = new Vector3(0, 0.9f, 0); body.transform.localScale = new Vector3(0.6f, 0.9f, 0.6f);
            body.GetComponent<Renderer>().material.color = new Color(0.12f, 0.12f, 0.13f);
            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere); head.transform.SetParent(go.transform, false); head.transform.localPosition = new Vector3(0, 1.68f, 0); head.transform.localScale = Vector3.one * 0.3f;
            head.GetComponent<Renderer>().material.color = new Color(0.08f, 0.08f, 0.09f);
            var g = GameObject.CreatePrimitive(PrimitiveType.Cube); Destroy(g.GetComponent<Collider>()); g.transform.SetParent(go.transform, false); g.transform.localPosition = new Vector3(0.22f, 1.3f, 0.35f); g.transform.localScale = new Vector3(0.06f, 0.08f, 0.7f);
            g.GetComponent<Renderer>().material.color = Color.black;
            var e = go.AddComponent<Enemy>(); e.Patrol = patrol; e.gun = g.transform; e.Dormant = dormant; go.SetActive(!dormant);
            All.Add(e); return e;
        }
        public void Activate() { Dormant = false; gameObject.SetActive(true); }
        public static void AlertAll(Vector3 p, float r) { foreach (var e in All) if (e.Alive && !e.Dormant && Vector3.Distance(e.transform.position, p) < r) e.Alert(GameBootstrap.I.Player.transform.position); }
        public void Alert(Vector3 p) { if (!Combat) aimT = 0.7f; Combat = true; lastKnown = p; lastSeen = Mathf.Max(lastSeen, Time.time - 2f); }

        public bool Hurt(float d)
        {
            if (!Alive) return false; Hp -= d; Alert(GameBootstrap.I.Player.transform.position);
            if (Hp <= 0) { Alive = false; transform.rotation = Quaternion.Euler(-85, transform.eulerAngles.y, 0); transform.position += Vector3.up * 0.25f; foreach (var c in GetComponentsInChildren<Collider>()) c.enabled = false; OnDeath?.Invoke(this); GameBootstrap.I.Mission.Kills++; return true; }
            return false;
        }

        bool Sees(out float dist)
        {
            var pl = GameBootstrap.I.Player; var eye = transform.position + Vector3.up * 1.6f; var tgt = pl.transform.position + Vector3.up * (pl.Crouching ? 0.9f : 1.4f);
            var to = tgt - eye; dist = to.magnitude;
            if (pl.Dead || dist > (Combat ? 70f : 40f)) return false;
            if (Vector3.Dot(transform.forward, to.normalized) < (Combat ? -0.2f : 0.4f) && dist > 2.5f) return false;
            foreach (var s in Smokes) { var c = new Vector3(s.x, s.y, s.z); var t = Mathf.Clamp01(Vector3.Dot(c - eye, to) / to.sqrMagnitude); if (Vector3.Distance(eye + to * t, c) < s.w * 0.8f) return false; }
            return !Physics.Raycast(eye, to.normalized, dist - 0.4f, ~0, QueryTriggerInteraction.Ignore) || Physics.Raycast(eye, to.normalized, out var h, dist) && h.collider.GetComponentInParent<PlayerController>() != null;
        }

        void Move(Vector3 target, float speed)
        {
            var to = target - transform.position; to.y = 0; if (to.magnitude < 0.5f) return;
            var dir = to.normalized;
            // feeler avoidance around containers
            if (Physics.Raycast(transform.position + Vector3.up, dir, 1.5f)) { var side = Vector3.Cross(Vector3.up, dir); dir = Physics.Raycast(transform.position + Vector3.up, side, 2f) ? -side : side; }
            transform.position += dir * speed * Time.deltaTime;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), Time.deltaTime * 6f);
        }

        void Update()
        {
            if (!Alive || Dormant) return;
            var pl = GameBootstrap.I.Player;
            think -= Time.deltaTime; bool sees = false; float dist = 99f;
            if (think <= 0) { think = 0.12f; sees = Sees(out dist); if (sees) { lastKnown = pl.transform.position; lastSeen = Time.time; if (!Combat) { detect += 0.12f * (dist < 8 ? 3f : 1.4f - dist / 40f) * 2f; if (detect > 1f) { Alert(lastKnown); AlertAll(transform.position, 25f); } } } else detect = Mathf.Max(0, detect - 0.02f); }
            else sees = Time.time - lastSeen < 0.15f;
            if (!Combat)
            {
                if (Patrol != null && Patrol.Length > 0) { if (wait > 0) wait -= Time.deltaTime; else { Move(Patrol[pi], 1.6f); if (Vector3.Distance(transform.position, Patrol[pi]) < 0.8f) { pi = (pi + 1) % Patrol.Length; wait = 2f; } } }
                return;
            }
            var toP = pl.transform.position - transform.position; toP.y = 0;
            if (sees)
            {
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(toP), Time.deltaTime * 9f);
                aimT -= Time.deltaTime; burstT -= Time.deltaTime;
                if (aimT <= 0)
                {
                    if (burst > 0 && burstT <= 0) { Shoot(toP.magnitude); burst--; burstT = 0.12f; }
                    else if (burst <= 0 && burstT <= 0) { burst = Random.Range(2, 6); burstT = Random.Range(0.6f, 1.6f); }
                }
                if (toP.magnitude > 30f) Move(pl.transform.position, 3f);
            }
            else if (Time.time - lastSeen > 1f) Move(lastKnown, 4.2f);
        }

        void Shoot(float d)
        {
            var pl = GameBootstrap.I.Player;
            float p = new[] { 0.14f, 0.24f, 0.36f }[Mission1.Difficulty] * Mathf.Clamp(1.25f - d / 70f, 0.25f, 1.2f);
            if (pl.Crouching) p *= 0.75f; if (pl.Speed01 > 0.5f) p *= 0.75f;
            GameBootstrap.I.Hud.PlayEnemyShot(transform.position);
            if (Random.value < p) pl.Hurt(Random.Range(10f, 18f) * new[] { 0.45f, 0.8f, 1.25f }[Mission1.Difficulty], transform.position);
        }
    }
}
