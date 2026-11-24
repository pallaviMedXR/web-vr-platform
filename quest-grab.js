/* Quest controller interaction for holographic-lab.html (A-Frame 1.7). */
AFRAME.registerComponent('quest-grab', {
    init: function () {
        this.held = null;
        this.buttons = new Set();
        this.offset = new THREE.Matrix4();
        this.target = new THREE.Matrix4();
        this.local = new THREE.Matrix4();
        this.distance = new THREE.Vector3();
        this.onDown = event => {
            this.buttons.add(event.type);
            this.grab();
        };
        this.onUp = event => {
            this.buttons.delete(event.type.replace('up', 'down'));
            if (!this.buttons.size) this.release();
        };
        this.onLost = () => {
            this.buttons.clear();
            this.release();
        };
        this.onReset = () => this.el.sceneEl.components['quest-lab'].reset();
        ['triggerdown', 'gripdown'].forEach(e => this.el.addEventListener(e, this.onDown));
        ['triggerup', 'gripup'].forEach(e => this.el.addEventListener(e, this.onUp));
        this.el.addEventListener('controllerdisconnected', this.onLost);
        this.el.addEventListener('abuttondown', this.onReset);
        this.el.addEventListener('xbuttondown', this.onReset);
        this.el.sceneEl.addEventListener('exit-vr', this.onLost);
        window.addEventListener('blur', this.onLost);
    },
    grab: function () {
        if (this.held || !this.el.sceneEl.is('vr-mode')) return;
        const ray = this.el.components.raycaster;
        if (!ray) return;
        // Refresh now so a button press uses the current controller pose.
        ray.checkIntersections();
        const hit = ray.intersections.find(hit => {
            const entity = hit.object.el && hit.object.el.closest('.grabbable');
            return entity && !entity.questGrabOwner && entity.object3D.visible;
        });
        if (!hit) return;
        const entity = hit.object.el.closest('.grabbable');
        entity.questGrabOwner = this;
        this.held = entity;
        this.el.object3D.updateWorldMatrix(true, false);
        entity.object3D.updateWorldMatrix(true, false);
        this.offset.copy(this.el.object3D.matrixWorld).invert()
            .multiply(entity.object3D.matrixWorld);
        this.el.setAttribute('raycaster', 'lineColor', '#F4C76B');
    },
    tick: function (time, delta) {
        if (!this.held) return;
        const tracked = this.el.components['tracked-controls'];
        if (tracked && tracked.pose === null) {
            this.onLost();
            return;
        }
        const gamepad = tracked && tracked.controller && tracked.controller.gamepad;
        const axes = gamepad && gamepad.axes;
        const axis = axes && axes.length >= 2 ? axes[axes.length - 1] : 0;
        if (Math.abs(axis) > 0.2) {
            this.distance.setFromMatrixPosition(this.offset);
            const length = this.distance.length();
            if (length > 0.001) {
                const next = THREE.MathUtils.clamp(
                    length - axis * Math.min(delta || 0, 50) * 0.0015, 0.25, 6
                );
                this.offset.setPosition(this.distance.multiplyScalar(next / length));
            }
        }
        const object = this.held.object3D;
        this.el.object3D.updateWorldMatrix(true, false);
        object.parent.updateWorldMatrix(true, false);
        this.target.multiplyMatrices(this.el.object3D.matrixWorld, this.offset);
        this.local.copy(object.parent.matrixWorld).invert().multiply(this.target);
        this.local.decompose(object.position, object.quaternion, object.scale);
    },
    release: function () {
        if (!this.held) return;
        delete this.held.questGrabOwner;
        this.held = null;
        this.el.setAttribute('raycaster', 'lineColor', '#42e5ff');
    },
    pause: function () {
        this.onLost();
    },
    remove: function () {
        this.onLost();
        ['triggerdown', 'gripdown'].forEach(e => this.el.removeEventListener(e, this.onDown));
        ['triggerup', 'gripup'].forEach(e => this.el.removeEventListener(e, this.onUp));
        this.el.removeEventListener('controllerdisconnected', this.onLost);
        this.el.removeEventListener('abuttondown', this.onReset);
        this.el.removeEventListener('xbuttondown', this.onReset);
        this.el.sceneEl.removeEventListener('exit-vr', this.onLost);
        window.removeEventListener('blur', this.onLost);
    }
});

AFRAME.registerComponent('quest-lab', {
    init: function () {
        this.snapshots = null;
        this.onEnter = () => {
            if (!this.el.is('vr-mode')) return;
            if (currentSpatialAnimation !== null) {
                cancelAnimationFrame(currentSpatialAnimation);
                currentSpatialAnimation = null;
            }
            this.models = [...this.el.querySelectorAll('.grabbable')];
            this.snapshots = this.models.map(entity => ({
                entity,
                position: entity.object3D.position.clone(),
                quaternion: entity.object3D.quaternion.clone(),
                scale: entity.object3D.scale.clone()
            }));
            this.el.querySelector('#cameraRig').object3D.position.y = 0;
            this.el.querySelector('a-camera').setAttribute('look-controls', 'enabled', true);
            document.body.classList.add('in-vr');
            this.el.querySelector('#questHelp').setAttribute('visible', true);
            this.session = this.el.renderer.xr.getSession();
            if (this.session) this.session.addEventListener('visibilitychange', this.onVisibility);
            this.reset();
        };
        this.onVisibility = () => {
            if (this.session.visibilityState !== 'visible') this.releaseAll();
        };
        this.onExit = () => {
            this.releaseAll();
            if (this.session) this.session.removeEventListener('visibilitychange', this.onVisibility);
            this.session = null;
            if (this.snapshots) this.snapshots.forEach(saved => {
                const object = saved.entity.object3D;
                object.position.copy(saved.position);
                object.quaternion.copy(saved.quaternion);
                object.scale.copy(saved.scale);
            });
            this.snapshots = null;
            this.el.querySelector('#cameraRig').object3D.position.y = 1.6;
            this.el.querySelector('a-camera').setAttribute('look-controls', 'enabled', false);
            this.el.querySelector('#questHelp').setAttribute('visible', false);
            document.body.classList.remove('in-vr');
        };
        this.el.addEventListener('enter-vr', this.onEnter);
        this.el.addEventListener('exit-vr', this.onExit);
    },
    releaseAll: function () {
        this.el.querySelectorAll('[quest-grab]').forEach(controller => {
            controller.components['quest-grab'].onLost();
        });
    },
    reset: function () {
        if (!this.el.is('vr-mode')) return;
        this.releaseAll();
        this.models.forEach((entity, index) => {
            const object = entity.object3D;
            object.position.set(index === 0 ? -0.65 : 0.65, 1.5, -1.8);
            object.quaternion.identity();
            object.scale.setScalar(1);
        });
    },
    remove: function () {
        this.onExit();
        this.el.removeEventListener('enter-vr', this.onEnter);
        this.el.removeEventListener('exit-vr', this.onExit);
    }
});
