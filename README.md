# web-vr-platform
Interactive 3D Anatomy Atlas featuring photogrammetry-based temporal bone models, holographic visualisation, anatomical landmarks, and interactive 3D exploration. Built with A-Frame and WebXR-ready web technologies.

## Open the atlas

Open these live GitHub Pages links in your desktop or Meta Quest browser:

| Page | Link |
| --- | --- |
| Desktop anatomy atlas | [Open desktop atlas](https://pallavimedxr.github.io/web-vr-platform/index.html) |
| Holographic laboratory | [Open holographic lab](https://pallavimedxr.github.io/web-vr-platform/holographic-lab.html) |
| Original immersive VR | [Open original VR](https://pallavimedxr.github.io/web-vr-platform/vr-lab.html) |
| VR preview — Quest testing | [Open VR preview](https://pallavimedxr.github.io/web-vr-platform/vr-lab-preview.html) |

GitHub Pages currently publishes the `testing-quest-integration` branch. To test the preview on Quest, open its link in Meta Quest Browser and select **Enter VR**.

## Holographic lab on Quest

Open the holographic laboratory in Meta Quest Browser and select **Enter VR**.

- Point either controller's blue ray at a model, then hold the **trigger** or **grip** to grab it. The ray turns gold while holding.
- Move and turn the controller to move and rotate the model. Release the button to leave it in place.
- While holding a model, pull the **thumbstick back** to bring it closer or push forward to move it farther away.
- Press **A** (right controller) or **X** (left controller) to reset both models in front of you.

Each model can be held by one controller at a time. Leaving VR restores the desktop layout. Desktop mouse drag and scroll controls remain available outside VR.

## Immersive VR laboratory

Open `vr-lab.html` in Meta Quest Browser and select **Enter VR**. The rounded panels retain 0.7 opacity and use bundled Inter typography, with one title per viewing mode.

- Point at a button and click the **trigger** to select it. Desktop users can click the same buttons with a mouse.
- **External**, **Internal**, and **Compare Both** switch model views and update the anatomy information.
- The model library and anatomy information start closed. **Models** and **Anatomy Info** show or hide their panels. The temporal bone library entry opens both models.
- **Show Labels** toggles specimen names. These identify the models; anatomical landmark positions have not been validated.
- Hold **trigger or grip** while pointing at a model to grab it; move and turn the controller to inspect, then release to leave it in place. Pull the thumbstick back to bring it closer, or push forward to move it away.
- **Reset View**, **A**, or **X** restores both models and closes the panels again, leaving the toolbar and view selector visible.

### Manipulation in the normal browser window

Outside VR, drag a model to rotate it. The browser preview has no extra manipulation panels, movement, or zoom controls. Enter VR for tracked controller grabbing and distance adjustment.

The shared controller code prevents grabbing through buttons and releases models when controller tracking or session visibility is lost. Actual headset interaction and readability still require device testing.

The Inter font is bundled under the SIL Open Font License; see `assets/fonts/Inter-LICENSE.txt`. OpenAI Sans is the preferred font when installed, with Inter and system fonts as fallbacks.
