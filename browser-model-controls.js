/* Simple drag-to-rotate for the browser preview. */
AFRAME.registerComponent('browser-model-controls', {
    init: function () {
        this.drag = null;
        this.ray = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.cameraQ = new THREE.Quaternion();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3();
        this.qx = new THREE.Quaternion();
        this.qy = new THREE.Quaternion();
        this.onDown = event => {
            if (this.el.is('vr-mode') || this.drag || event.button !== 0) return;
            this.updateRay(event);
            const targets = [...this.el.querySelectorAll('.model-hit, .lab-hit')].map(e => e.object3D);
            this.el.object3D.updateMatrixWorld(true);
            const hit = this.ray.intersectObjects(targets, true).find(hit => labObjectVisible(hit.object));
            const model = hit && hit.object.el && hit.object.el.closest('.grabbable');
            if (!model) return; // Buttons use their normal cursor click handler.
            this.drag = {model, id: event.pointerId, x: event.clientX, y: event.clientY};
            this.canvas.setPointerCapture(event.pointerId);
            this.canvas.style.cursor = 'grabbing';
            event.preventDefault();
        };
        this.onMove = event => {
            const drag = this.drag;
            if (!drag || event.pointerId !== drag.id) return;
            if (this.el.is('vr-mode')) { this.endDrag(); return; }
            const object = drag.model.object3D;
            this.el.camera.getWorldQuaternion(this.cameraQ);
            this.right.set(1, 0, 0).applyQuaternion(this.cameraQ);
            this.up.set(0, 1, 0).applyQuaternion(this.cameraQ);
            this.qx.setFromAxisAngle(this.right, (event.clientY - drag.y) * 0.008);
            this.qy.setFromAxisAngle(this.up, (event.clientX - drag.x) * 0.008);
            object.quaternion.premultiply(this.qx).premultiply(this.qy).normalize();
            drag.x = event.clientX;
            drag.y = event.clientY;
            event.preventDefault();
        };
        this.onUp = event => { if (this.drag && event.pointerId === this.drag.id) this.endDrag(); };
        this.onBlur = () => this.endDrag();
        this.onReady = () => {
            if (this.canvas) return;
            this.canvas = this.el.canvas;
            this.canvas.addEventListener('pointerdown', this.onDown);
            this.canvas.addEventListener('lostpointercapture', this.onUp);
            window.addEventListener('pointermove', this.onMove, {passive: false});
            window.addEventListener('pointerup', this.onUp);
            window.addEventListener('pointercancel', this.onUp);
            window.addEventListener('blur', this.onBlur);
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
    }
});
