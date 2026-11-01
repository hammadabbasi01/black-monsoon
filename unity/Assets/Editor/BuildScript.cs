using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

// Called by CI (GameCI buildMethod). Creates the single bootstrap scene in code, then builds the APK.
public static class BuildScript
{
    const string ScenePath = "Assets/Scenes/Main.unity";

    [MenuItem("Black Monsoon/Create Main Scene")]
    public static void CreateScene()
    {
        Directory.CreateDirectory("Assets/Scenes");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var go = new GameObject("GameBootstrap");
        go.AddComponent<BlackMonsoon.GameBootstrap>();
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
    }

    public static void BuildAndroid()
    {
        CreateScene();
        PlayerSettings.companyName = "SRCA";
        PlayerSettings.productName = "Black Monsoon";
        PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.srca.blackmonsoon.unity");
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
        PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel24;
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.Mono2x);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7;
        EditorUserBuildSettings.buildAppBundle = false;
        Directory.CreateDirectory("build/Android");
        var opts = new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = "build/Android/BlackMonsoon-Unity.apk",
            target = BuildTarget.Android,
            options = BuildOptions.None
        };
        var report = BuildPipeline.BuildPlayer(opts);
        if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
            throw new System.Exception("Build failed: " + report.summary.result);
    }
}
