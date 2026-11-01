using UnityEngine;

namespace BlackMonsoon
{
    // Mobile controls: left half = virtual joystick, right half = look drag. Buttons are drawn by Hud and set flags here.
    public static class TouchInput
    {
        public static Vector2 Move, Look;
        public static bool Fire, Aim, Sprint;
        public static bool ReloadTap, JumpTap, CrouchTap, NadeTap, SmokeTap, KnifeTap, SwapTap, UseHeld;
        static int joyId = -1, lookId = -1; static Vector2 joyStart, lookLast;
        public static Rect[] ButtonRects = new Rect[0];

        public static bool Active => Input.touchSupported && Application.isMobilePlatform;

        public static void Update()
        {
            Look = Vector2.zero;
            if (!Active) return;
            foreach (var t in Input.touches)
            {
                var gp = new Vector2(t.position.x, Screen.height - t.position.y);
                bool onButton = false; foreach (var r in ButtonRects) if (r.Contains(gp)) onButton = true;
                if (t.phase == TouchPhase.Began && !onButton)
                {
                    if (t.position.x < Screen.width * 0.42f && joyId < 0) { joyId = t.fingerId; joyStart = t.position; }
                    else if (lookId < 0) { lookId = t.fingerId; lookLast = t.position; }
                }
                if (t.fingerId == joyId)
                {
                    var d = (t.position - joyStart) / (Screen.dpi > 0 ? Screen.dpi * 0.45f : 120f);
                    Move = Vector2.ClampMagnitude(d, 1f); Sprint = d.y > 1.2f;
                    if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled) { joyId = -1; Move = Vector2.zero; Sprint = false; }
                }
                else if (t.fingerId == lookId)
                {
                    Look += (t.position - lookLast) * 0.12f; lookLast = t.position;
                    if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled) lookId = -1;
                }
            }
        }
        public static void ClearTaps() { ReloadTap = JumpTap = CrouchTap = NadeTap = SmokeTap = KnifeTap = SwapTap = false; }
    }
}
