/* Canvas text uses the same font family in the browser header and in WebXR. */
AFRAME.registerComponent('ui-text', {
    schema: {
        value: {default: ''}, color: {default: '#e9faff'}, width: {default: 1},
        align: {default: 'left'}, anchor: {default: 'auto'}, baseline: {default: 'center'},
        fontSize: {default: 0.052}, weight: {default: 400}, wrapCount: {default: 0}
    },
    init: function () {
        this.disposed = false;
        document.fonts.load('400 64px Inter').then(() => {
            if (!this.disposed) this.update();
        }).catch(() => { /* Keep the system-font rendering if the font cannot load. */ });
    },
    update: function () {
        const data = this.data;
        const density = Math.min(1600, 2048 / data.width);
        const fontSize = data.fontSize * density;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const font = `${data.weight} ${fontSize}px "OpenAI Sans", Inter, system-ui, sans-serif`;
        context.font = font;
        const maxWidth = data.width * density - 4;
        const lines = [];
        const value = data.value.replace(/\\n/g, '\n');
        value.split('\n').forEach(paragraph => {
            let line = '';
            paragraph.split(/\s+/).filter(Boolean).forEach(word => {
                const candidate = line ? line + ' ' + word : word;
                if (line && context.measureText(candidate).width > maxWidth) {
                    lines.push(line);
                    line = word;
                } else line = candidate;
            });
            lines.push(line);
        });
        const lineHeight = fontSize * 1.4;
        canvas.width = Math.ceil(data.width * density);
        canvas.height = Math.ceil(Math.max(1, lines.length) * lineHeight + fontSize * 0.25);
        context.font = font;
        context.fillStyle = data.color;
        context.textAlign = data.align;
        context.textBaseline = 'middle';
        const x = data.align === 'center' ? canvas.width / 2 :
            data.align === 'right' ? canvas.width - 2 : 2;
        lines.forEach((line, i) => context.fillText(line, x, lineHeight * (i + 0.5)));
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        const height = canvas.height / density;
        const geometry = new THREE.PlaneGeometry(data.width, height);
        const material = new THREE.MeshBasicMaterial({
            map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
            toneMapped: false, alphaTest: 0.01
        });
        this.disposeMesh();
        this.mesh = new THREE.Mesh(geometry, material);
        const anchor = data.anchor === 'auto' ? data.align : data.anchor;
        this.mesh.position.x = anchor === 'left' ? data.width / 2 :
            anchor === 'right' ? -data.width / 2 : 0;
        this.mesh.position.y = data.baseline === 'top' ? -height / 2 : 0;
        this.el.setObject3D('text', this.mesh);
    },
    disposeMesh: function () {
        if (!this.mesh) return;
        this.el.removeObject3D('text');
        this.mesh.geometry.dispose();
        this.mesh.material.map.dispose();
        this.mesh.material.dispose();
        this.mesh = null;
    },
    remove: function () { this.disposed = true; this.disposeMesh(); }
});

AFRAME.registerPrimitive('a-atlas-text', {
    defaultComponents: {'ui-text': {}},
    mappings: {
        value: 'ui-text.value', color: 'ui-text.color', width: 'ui-text.width',
        align: 'ui-text.align', anchor: 'ui-text.anchor', baseline: 'ui-text.baseline',
        'font-size': 'ui-text.fontSize', 'font-weight': 'ui-text.weight',
        'wrap-count': 'ui-text.wrapCount'
    }
});

function labObjectVisible(object) {
    for (; object; object = object.parent) if (!object.visible) return false;
    return true;
}

AFRAME.registerComponent('lab-action', {
    schema: {type: 'string'},
    init: function () {
        this.hovered = false;
        this.onEnter = () => { this.hovered = true; this.paint(); };
        this.onLeave = () => { this.hovered = false; this.paint(); };
        this.onClick = event => {
            if (!labObjectVisible(this.el.object3D)) return;
            event.stopPropagation();
            this.el.sceneEl.components['immersive-lab'].act(this.data);
        };
        this.el.addEventListener('mouseenter', this.onEnter);
        this.el.addEventListener('mouseleave', this.onLeave);
        this.el.addEventListener('click', this.onClick);
    },
    paint: function () {
        this.el.setAttribute('material', 'color', this.hovered ? '#1185a4' :
            this.el.classList.contains('is-active') ? '#005777' : '#06344d');
    },
    remove: function () {
        this.el.removeEventListener('mouseenter', this.onEnter);
        this.el.removeEventListener('mouseleave', this.onLeave);
        this.el.removeEventListener('click', this.onClick);
    }
});

AFRAME.registerComponent('immersive-lab', {
    init: function () {
        this.mode = 'compare';
        this.labels = false;
        this.ready = false;
        // Update the mouse ray before cursor mousedown, including a quick first click.
        this.onMouseDown = () => {
            if (this.el.is('vr-mode')) return;
            const cursor = this.el.querySelector('#desktopCursor');
            if (cursor && cursor.components.raycaster) cursor.components.raycaster.checkIntersections();
        };
        this.onReady = () => {
            if (this.ready) return;
            this.ready = true;
            this.models = ['external', 'internal'].map(name => this.el.querySelector('#' + name + 'VR'));
            this.library = this.el.querySelector('#labLibrary');
            this.info = this.el.querySelector('#labAnatomyInfo');
            this.reset();
        };
        this.onEnter = () => {
            this.releaseAll();
            this.el.querySelector('a-camera').setAttribute('look-controls', 'enabled', true);
            document.body.classList.add('in-vr');
            this.el.querySelector('#vrOnlyTitle').setAttribute('visible', true);
            this.session = this.el.renderer.xr.getSession();
            if (this.session) this.session.addEventListener('visibilitychange', this.onVisibility);
        };
        this.onExit = () => {
            this.el.querySelector('a-camera').setAttribute('look-controls', 'enabled', false);
            document.body.classList.remove('in-vr');
            this.el.querySelector('#vrOnlyTitle').setAttribute('visible', false);
            this.releaseAll();
            if (this.session) this.session.removeEventListener('visibilitychange', this.onVisibility);
            this.session = null;
        };
        this.onVisibility = () => {
            if (this.session.visibilityState !== 'visible') this.releaseAll();
        };
        this.el.addEventListener('loaded', this.onReady);
        this.el.addEventListener('mousedown', this.onMouseDown, true);
        this.el.addEventListener('enter-vr', this.onEnter);
        this.el.addEventListener('exit-vr', this.onExit);
        if (this.el.hasLoaded) this.onReady();
    },
    releaseAll: function () {
        const browser = this.el.components['browser-model-controls'];
        if (browser) browser.endDrag();
        this.el.querySelectorAll('[quest-grab]').forEach(controller => {
            const grab = controller.components['quest-grab'];
            if (grab) grab.onLost();
        });
    },
    setView: function (mode) {
        if (!this.ready || !['external', 'internal', 'compare'].includes(mode)) return;
        this.releaseAll();
        this.mode = mode;
        this.models.forEach((entity, index) => {
            const view = index === 0 ? 'external' : 'internal';
            const shown = mode === 'compare' || mode === view;
            entity.setAttribute('visible', shown);
            entity.object3D.position.set(mode === 'compare' ? (index ? 0.65 : -0.65) : 0,
                1.5, mode === 'compare' ? -2.5 : -2.3);
            entity.object3D.scale.setScalar(mode === 'compare' ? 1 : 1.15);
            const heading = this.el.querySelector('#' + view + 'Heading');
            heading.setAttribute('visible', shown);
            heading.object3D.position.set(entity.object3D.position.x, 2.12, entity.object3D.position.z);
        });
        const external = mode !== 'internal';
        this.el.querySelector('#infoTitle').setAttribute('ui-text', 'value',
            'Temporal Bone - ' + (external ? 'External View' : 'Internal View'));
        this.el.querySelector('#infoDescription').setAttribute('ui-text', 'value', external ?
            'The temporal bone forms part of the lateral skull and cranial base. It contributes to the temporomandibular joint and houses structures associated with hearing and balance.' :
            'The temporal bone houses structures of the middle and inner ear involved in hearing and equilibrium. This specimen presents the internal view.');
        this.sync();
    },
    act: function (action) {
        if (!this.ready) return;
        if (['external', 'internal', 'compare'].includes(action)) this.setView(action);
        else if (action === 'models') this.library.setAttribute('visible', !this.library.object3D.visible);
        else if (action === 'info') this.info.setAttribute('visible', !this.info.object3D.visible);
        else if (action === 'labels') {
            this.labels = !this.labels;
            this.el.querySelectorAll('.specimen-label').forEach(label => label.setAttribute('visible', this.labels));
            this.el.querySelector('#labelsText').setAttribute('ui-text', 'value', this.labels ? 'Hide Labels' : 'Show Labels');
        } else if (action === 'open-ear') {
            this.setView('compare');
            this.library.setAttribute('visible', false);
        } else if (action === 'reset') this.reset();
        this.sync();
    },
    sync: function () {
        this.el.querySelectorAll('[lab-action]').forEach(button => {
            const action = button.getAttribute('lab-action');
            const active = action === this.mode || action === 'models' && this.library.object3D.visible ||
                action === 'info' && this.info.object3D.visible || action === 'labels' && this.labels;
            button.classList.toggle('is-active', !!active);
            button.classList.toggle('lab-hit', labObjectVisible(button.object3D));
            const component = button.components['lab-action'];
            if (component) { component.hovered = false; component.paint(); }
        });
        this.models.forEach(entity => entity.querySelector('[gltf-model]').classList.toggle(
            'model-hit', labObjectVisible(entity.object3D)));
    },
    reset: function () {
        if (!this.ready) return;
        this.labels = false;
        this.el.querySelectorAll('.specimen-label').forEach(label => label.setAttribute('visible', false));
        this.el.querySelector('#labelsText').setAttribute('ui-text', 'value', 'Show Labels');
        this.models.forEach(entity => entity.object3D.quaternion.identity());
        this.library.setAttribute('visible', false);
        this.info.setAttribute('visible', false);
        this.setView('compare');
    },
    remove: function () {
        this.onExit();
        this.el.removeEventListener('loaded', this.onReady);
        this.el.removeEventListener('mousedown', this.onMouseDown, true);
        this.el.removeEventListener('enter-vr', this.onEnter);
        this.el.removeEventListener('exit-vr', this.onExit);
    }
});
