// Rounded geometry keeps the interface inside the WebXR scene.
AFRAME.registerGeometry('rounded-panel', {
    schema: {
        width: {default: 1},
        height: {default: 1},
        radius: {default: 0.06}
    },
    init: function (data) {
        const x = -data.width / 2;
        const y = -data.height / 2;
        const w = data.width;
        const h = data.height;
        const r = Math.max(0, Math.min(data.radius, w / 2, h / 2));
        const shape = new THREE.Shape();
        shape.moveTo(x + r, y);
        shape.lineTo(x + w - r, y);
        shape.quadraticCurveTo(x + w, y, x + w, y + r);
        shape.lineTo(x + w, y + h - r);
        shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        shape.lineTo(x + r, y + h);
        shape.quadraticCurveTo(x, y + h, x, y + h - r);
        shape.lineTo(x, y + r);
        shape.quadraticCurveTo(x, y, x + r, y);
        this.geometry = new THREE.ShapeGeometry(shape);
    }
});
