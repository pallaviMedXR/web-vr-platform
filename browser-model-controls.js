/* Pointer gestures for mouse, touch, and Quest Browser's windowed page view. */
AFRAME.registerComponent('browser-model-controls', {
    init: function () {
        this.drag = null;
        this.mode = 'rotate';
        this.ray = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.plane = new THREE.Plane();
        this.point = new THREE.Vector3();
        this.normal = new THREE.Vector3();
        this.worldPosition = new THREE.Vector3();
        this.cameraQ = new THREE.Quaternion();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3();
        this.qx = new THREE.Quaternion();
        this.qy = new THREE.Quaternion();
        this.controls = document.getElementById('browserControls');
        this.selector = document.getElementById('browserModel');
        this.onDown = event => {
            if (this.el.is('vr-mode') || this.drag || event.button !== 0) return;
            this.updateRay(event);
            const targets = [...this.el.querySelectorAll('.model-hit, .lab-hit')].map(e => e.object3D);
            this.el.object3D.updateMatrixWorld(true);
            const hit = this.ray.intersectObjects(targets, true).find(hit => labObjectVisible(hit.object));
            const model = hit && hit.object.el && hit.object.el.closest('.grabbable');
            if (!model) return; // Buttons use their normal cursor click handler.
            this.selectModel(model);
            this.el.camera.getWorldDirection(this.normal);
            model.object3D.getWorldPosition(this.worldPosition);
            this.plane.setFromNormalAndCoplanarPoint(this.normal, this.worldPosition);
            if (!this.ray.ray.intersectPlane(this.plane, this.point)) return;
            this.drag = {model, id: event.pointerId, x: event.clientX, y: event.clientY,
                point: this.point.clone()};
            this.canvas.setPointerCapture(event.pointerId);
            this.canvas.style.cursor = 'grabbing';
            event.preventDefault();
        };
        this.onMove = event => {
            const drag = this.drag;
            if (!drag || event.pointerId !== drag.id) return;
            if (this.el.is('vr-mode')) { this.endDrag(); return; }
            const object = drag.model.object3D;
            if (this.mode === 'move') {
                this.updateRay(event);
                if (this.ray.ray.intersectPlane(this.plane, this.point)) {
                    object.getWorldPosition(this.worldPosition).add(this.point).sub(drag.point);
                    object.position.copy(object.parent.worldToLocal(this.worldPosition));
                    drag.point.copy(this.point);
                }
            } else {
                this.el.camera.getWorldQuaternion(this.cameraQ);
                this.right.set(1, 0, 0).applyQuaternion(this.cameraQ);
                this.up.set(0, 1, 0).applyQuaternion(this.cameraQ);
                this.qx.setFromAxisAngle(this.right, (event.clientY - drag.y) * 0.008);
                this.qy.setFromAxisAngle(this.up, (event.clientX - drag.x) * 0.008);
                object.quaternion.premultiply(this.qx).premultiply(this.qy).normalize();
            }
            drag.x = event.clientX;
            drag.y = event.clientY;
            event.preventDefault();
        };
        this.onUp = event => { if (this.drag && event.pointerId === this.drag.id) this.endDrag(); };
        this.onBlur = () => this.endDrag();
        this.onSelect = () => {
            this.endDrag();
            const model = this.el.querySelector('#' + this.selector.value);
            if (model && model.object3D.visible) this.selectModel(model);
        };
        this.onControl = event => {
            const button = event.target.closest('button[data-browser-action]');
            if (!button || this.el.is('vr-mode')) return;
            const action = button.dataset.browserAction;
            this.endDrag();
            if (action === 'rotate' || action === 'move') {
                this.mode = action;
                this.updateButtons();
            } else if (action === 'reset') {
                this.mode = 'rotate';
                this.el.components['immersive-lab'].reset();
                this.selectModel(this.el.querySelector('#externalVR'));
                this.updateButtons();
            } else if (action === 'zoom-in' || action === 'zoom-out') {
                this.selectVisible();
                if (!this.selected) return;
                const object = this.selected.object3D;
                const scale = THREE.MathUtils.clamp(object.scale.x * (action === 'zoom-in' ? 1.15 : 1 / 1.15), 0.4, 2);
                object.scale.setScalar(scale);
            }
        };
        this.onReady = () => {
            if (this.canvas) return;
            this.canvas = this.el.canvas;
            this.canvas.addEventListener('pointerdown', this.onDown);
            this.canvas.addEventListener('lostpointercapture', this.onUp);
            window.addEventListener('pointermove', this.onMove, {passive: false});
            window.addEventListener('pointerup', this.onUp);
            window.addEventListener('pointercancel', this.onUp);
            window.addEventListener('blur', this.onBlur);
            this.controls.addEventListener('click', this.onControl);
            this.selector.addEventListener('change', this.onSelect);
            this.selectVisible();
            this.updateButtons();
        };
        this.el.addEventListener('loaded', this.onReady);
        if (this.el.hasLoaded) this.onReady();
    },
    updateRay: function (event) {
        const rect = this.el.canvas.getBoundingClientRect();
        this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
            -(event.clientY - rect.top) / rect.height * 2 + 1);
        this.el.camera.updateWorldMatrix(true, false);
        this.ray.setFromCamera(this.pointer, this.el.camera);
    },
    selectModel: function (model) {
        this.selected = model;
        this.selector.value = model.id;
    },
    selectVisible: function () {
        const models = [...this.el.querySelectorAll('.grabbable')];
        models.forEach(model => {
            const option = this.selector.querySelector('option[value="' + model.id + '"]');
            if (option) option.disabled = !model.object3D.visible;
        });
        if (!this.selected || !this.selected.object3D.visible) {
            const model = models.find(model => model.object3D.visible);
            if (model) this.selectModel(model);
        }
    },
    updateButtons: function () {
        this.controls.querySelectorAll('[data-browser-action="rotate"], [data-browser-action="move"]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.browserAction === this.mode));
        });
    },
    endDrag: function () {
        if (!this.drag) return;
        const id = this.drag.id;
        this.drag = null;
        if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
        this.canvas.style.cursor = '';
    },
    remove: function () {
        this.endDrag();
        this.el.removeEventListener('loaded', this.onReady);
        if (!this.canvas) return;
        this.canvas.removeEventListener('pointerdown', this.onDown);
        this.canvas.removeEventListener('lostpointercapture', this.onUp);
        window.removeEventListener('pointermove', this.onMove);
        window.removeEventListener('pointerup', this.onUp);
        window.removeEventListener('pointercancel', this.onUp);
        window.removeEventListener('blur', this.onBlur);
        this.controls.removeEventListener('click', this.onControl);
        this.selector.removeEventListener('change', this.onSelect);
    }
});
