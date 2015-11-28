declare module BABYLON.EDITOR {
    class SceneManager {
        engine: Engine;
        canvas: HTMLCanvasElement;
        scenes: Array<ICustomScene>;
        currentScene: Scene;
        updates: Array<ICustomUpdate>;
        eventReceivers: Array<IEventReceiver>;
        editor: EditorMain;
        static configureObject(object: AbstractMesh | Scene, core: EditorCore): void;
    }
}