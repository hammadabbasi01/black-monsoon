using UnityEngine;

namespace BlackMonsoon
{
    // Capt. Rogers: follows Falcon or holds a scripted point, and fires at alerted enemies in sight.
    public class Ally : MonoBehaviour
    {
        public Vector3? Hold; float shootT;
        public static Ally Spawn(Vector3 pos)
        {
            var go = new GameObject("Capt. Rogers"); go.transform.position = pos;
            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule); Destroy(body.GetComponent<Collider>()); body.transform.SetParent(go.transform, false); body.transform.localPosition = new Vector3(0, 0.9f, 0); body.transform.localScale = new Vector3(0.6f, 0.9f, 0.6f);
            body.GetComponent<Renderer>().material.color = new Color(0.36f, 0.4f, 0.3f);
            var hat = GameObject.CreatePrimitive(PrimitiveType.Cylinder); Destroy(hat.GetComponent<Collider>()); hat.transform.SetParent(go.transform, false); hat.transform.localPosition = new Vector3(0, 1.85f, 0); hat.transform.localScale = new Vector3(0.45f, 0.03f, 0.45f);
            hat.GetComponent<Renderer>().material.color = new Color(0.3f, 0.33f, 0.24f);
            return go.AddComponent<Ally>();
        }
        void Update()
        {
            var pl = GameBootstrap.I.Player.transform;
            Vector3 target = Hold ?? pl.position - pl.forward * 2.5f + pl.right * 1.5f;
            var to = target - transform.position; to.y = 0;
            if (to.magnitude > (Hold.HasValue ? 0.6f : 3f)) { transform.position += to.normalized * Mathf.Min(to.magnitude > 8 ? 4.6f : 2f, to.magnitude) * Time.deltaTime; transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(to), Time.deltaTime * 5f); }
            if (to.magnitude > 45f) transform.position = pl.position - pl.forward * 4f;
            transform.position = new Vector3(transform.position.x, Physics.Raycast(transform.position + Vector3.up * 3f, Vector3.down, out var h, 20f) ? h.point.y : transform.position.y, transform.position.z);
            shootT -= Time.deltaTime;
            if (shootT > 0) return; shootT = 1.2f;
            foreach (var e in Enemy.All)
            {
                if (!e.Alive || e.Dormant || !e.Combat) continue;
                var d = e.transform.position - transform.position; if (d.magnitude > 50f) continue;
                if (Physics.Raycast(transform.position + Vector3.up * 1.6f, d.normalized, out var hit, d.magnitude) && hit.collider.GetComponentInParent<Enemy>() != e) continue;
                transform.rotation = Quaternion.LookRotation(new Vector3(d.x, 0, d.z));
                if (Random.value < 0.3f) e.Hurt(60f);
                break;
            }
        }
    }
}
