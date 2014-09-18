﻿/// <reference path="./index.html" />

var BABYLON;
(function (BABYLON) { /// namespace BAYBLON
var Editor;
(function (Editor) { /// namespace Editor

var BabylonEditor = (function () {

    function BabylonEditor(babylonEditorCore) {
        this.engine = null;

        /// An editor must manage multiple scenes. Then, you'll be able to mange different
        /// worlds in your video game
        this.scenes = new Array();

        /// Core
        this.transformer = null;

        this._core = babylonEditorCore;
        this._core.customUpdates.push(this);

        this.camera = null;

        /// Gui elements
        this._layouts = null;
        this._mainToolbar = null;
        this._editionTool = null;
        this._graphTool = null;

        /// Methods
        this._createUI();
    };

    BabylonEditor.prototype.update = function () {
        this._core.currentScene.render();
    }

    BabylonEditor.prototype.dragAndDrop = function (canvas) {
        var scope = this;

        /// scene loaded callback
        function sceneLoaded(file, scene) {
            /// Clear the graph tool
            scope._core.transformer.setNodeToTransform(null);
            /// Clears the graph if the graph already exists
            scope._graphTool._createUI();

            /// Scene already exists, just replace it
            var index = scope.scenes.indexOf(scope._core.currentScene);
            scope.scenes[index] = scene;
            scene.activeCamera = scope._core.currentScene.activeCamera;
            scene.cameras.splice(0, scene.cameras.length);
            scene.cameras.push(scope._core.currentScene.activeCamera);
            /// Remove current scene
            scope._core.currentScene.dispose();

            /// Send events
            for (var i = 0; i < scene.meshes.length; i++) {
                scene.meshes[i].checkCollisions = true;
                BABYLON.Editor.Utils.sendEventObjectAdded(scene.meshes[i], scope._core);
            }
            for (var i = 0; i < scene.lights; i++) {
                BABYLON.Editor.Utils.sendEventObjectAdded(scene.lights[i], scope._core);
            }

            /// Set as current scene
            scope._core.currentScene = scene;
        }

        /// Create file input and fill callbacks
        this._core.filesInput = new BABYLON.FilesInput(this.engine, null, canvas, sceneLoaded, null, function () {
            scope.engine.runRenderLoop(function () {
                scope._core.update();
                scope._core.transformer.update();
            });
        });
        this._core.filesInput.monitorElementForDragNDrop(canvas);
    }

    BabylonEditor.prototype._createUI = function () {

        /// Global style
        var pstyle = BabylonEditorUICreator.Layout.Style;

        /// Create Layouts in one shot
        var panels = new Array();
        BabylonEditorUICreator.Layout.extendPanels(panels, [
            BabylonEditorUICreator.Layout.createPanel('top', 70, true, pstyle,
                '<div id="MainToolBar" style="height: 50%"></div>'
                + '<div id="MainToolsToolBar" style="height: 50%"></div>',
                70, 70
            ),
            BabylonEditorUICreator.Layout.createPanel('left', 350, true, pstyle, '<div id="MainEditorEditObject"></div>', 10, false, [
                BabylonEditorUICreator.Layout.createTab('MainEditorEditObjectGeneral', 'General'),
                BabylonEditorUICreator.Layout.createTab('MainEditorEditObjectMaterial', 'Material')
            ]),
            BabylonEditorUICreator.Layout.createPanel('main', 350, true, pstyle, '<canvas id="renderCanvas"></canvas>', 350, false, [
                BabylonEditorUICreator.Layout.createTab('MainScene', 'Main scene'),
                BabylonEditorUICreator.Layout.createTab('scene2', 'Test Scene')
            ]),
            BabylonEditorUICreator.Layout.createPanel('right', 350, true, pstyle, '<div id="MainGraphTool" style="height: 100%"></div>', 10),
            BabylonEditorUICreator.Layout.createPanel('bottom', 50, true, pstyle, '<div id="MainOptionsBar" style="height: 100%"></div>')
        ]);
        this._layouts = BabylonEditorUICreator.Layout.createLayout('Mainlayout', panels);

        /// Create Babylon's engine here. Then, we'll be able to manage events like onClick, onResize, etc.
        var canvas = document.getElementById("renderCanvas");
        this._core.canvas = canvas;
        var scope = this;

        /// FIXME: Must work on IE
        canvas.addEventListener('dblclick', function(event) {
            scope._core.getPickedMesh(event, true);
        });

        /// FIXME: events don't necessary call function(target, eventData);
        /// FIXED
        BabylonEditorUICreator.addEvent(this._layouts, 'resize', function () {
            scope.engine.resize();
        });

        /// Configure "this"
        this.engine = new BABYLON.Engine(canvas, true);
        this._core.engine = this.engine;

        /// Create tool bar
        this._mainToolbar = new BABYLON.Editor.MainToolbar(this._core);
        this._mainToolbar._createUI();

        /// Create Left Edition Tool
        this._editionTool = new BABYLON.Editor.EditionTool(this._core, this._layouts);

        /// Create Right Sidebar (Scene Graph)
        this._graphTool = new BABYLON.Editor.GraphTool(this._core);
        this._graphTool._createUI();

        /// Create bottom toolbar (empty for the moment)
        BabylonEditorUICreator.Toolbar.createToolbar('MainOptionsToolbar', []);

        /// Finish configuration and create default camera
        var scene = new BABYLON.Scene(this.engine);

        this.scenes.push(scene);
        this._core.currentScene = scene;

        this.camera = new BABYLON.FreeCamera("BabylonEditorCamera", new BABYLON.Vector3(0, 5, -10), scene);
        this.camera.setTarget(new BABYLON.Vector3.Zero());
        this.camera.attachControl(canvas, false);

        this.transformer = new BABYLON.Editor.Transformer(this.engine, this._core);

        this._graphTool._fillGraph(null, null);

        this.dragAndDrop(canvas);
    };

    return BabylonEditor;
})();

BABYLON.Editor.BabylonEditor = BabylonEditor;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON