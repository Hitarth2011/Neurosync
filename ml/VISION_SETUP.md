# Vision experiment: static image before camera

This project does **not** enable a live camera yet. First prove that a pretrained
object detector can identify supported objects in one still image.

1. Install Python 3.11 and create the existing `ml/.venv` environment.
2. For the first static test, a CPU PyTorch build is enough. For later GPU use,
   install a CUDA-enabled PyTorch build that matches the laptop's NVIDIA driver;
   use the current selector at https://pytorch.org/get-started/locally/.
3. Install the small, separate vision dependency set:

   ```powershell
   ml\.venv\Scripts\python.exe -m pip install -r ml\vision-requirements.txt
   ```

4. Run the static check on a photo containing a common COCO object (for example,
   a cup, book, backpack, chair, or person):

   ```powershell
   ml\.venv\Scripts\python.exe ml\vision_static_test.py C:\path\to\test-image.jpg --device cpu
   ```

The first run downloads `yolo11n.pt`. A JSON result with `"status":"success"`
and detections proves object inference works. `"uncertain"` means no supported
object was visible—not that a child failed a task.

On this computer the static test was verified in CPU mode on
`frontend/public/backdrop.jpg`, where the model detected visible people. Once a
CUDA-compatible PyTorch build is intentionally installed, repeat the same
command with `--device 0` to use the NVIDIA GPU.

Do not add live video until this static test succeeds on the intended computer.
Even then, raw video should stay off by default; record only the limited evidence
needed for a teaching step and ask the caretaker whenever the camera is uncertain.

## Licensing note

Ultralytics distributes its open-source software under AGPL-3.0 and also offers an
enterprise license. Confirm the appropriate license before distributing a
commercial or closed-source product.
