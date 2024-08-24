const uploadBtn = document.getElementById('uploadBtn');
const container = document.getElementById('container');
const placeholderImage = document.getElementById('placeholderImage');
const distanceInputWrapper = document.getElementById('distanceInputWrapper');
const setScaleBtn = document.getElementById('setScaleBtn');
const furnitureControls = document.getElementById('furnitureControls');
const addFurnitureBtn = document.getElementById('addFurnitureBtn');
let stage, layer, konvaImage;
let scaleFactor = null;
let line, startPoint, endPoint;
let selectedFurniture = null;

uploadBtn.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imageObj = new Image();
            imageObj.onload = function () {
                // Remove 'inactive' class when the floor plan is uploaded
                const stepsSection = document.querySelector('.steps');
                stepsSection.classList.remove('inactive');

                const containerHeight = container.clientHeight;
                const containerWidth = container.clientWidth;
                const aspectRatio = imageObj.width / imageObj.height;

                let scaledWidth, scaledHeight;

                if (imageObj.width > imageObj.height) {
                    scaledWidth = containerWidth;
                    scaledHeight = containerWidth / aspectRatio;
                    if (scaledHeight > containerHeight) {
                        scaledHeight = containerHeight;
                        scaledWidth = containerHeight * aspectRatio;
                    }
                } else {
                    scaledHeight = containerHeight;
                    scaledWidth = containerHeight * aspectRatio;
                    if (scaledWidth > containerWidth) {
                        scaledWidth = containerWidth;
                        scaledHeight = containerWidth / aspectRatio;
                    }
                }

                if (stage) {
                    stage.destroy();
                }

                stage = new Konva.Stage({
                    container: 'container',
                    width: scaledWidth,
                    height: scaledHeight,
                });

                layer = new Konva.Layer();
                stage.add(layer);

                konvaImage = new Konva.Image({
                    x: 0,
                    y: 0,
                    image: imageObj,
                    width: scaledWidth,
                    height: scaledHeight,
                });

                layer.add(konvaImage);
                layer.draw();

                placeholderImage.style.display = 'none';

                enableScaleDrawing();

                stage.on('click', (e) => {
                    if (selectedFurniture) {
                        selectedFurniture.rect.fill('#60A5FA');
                        selectedFurniture = null;
                        layer.draw();
                    }
                });
            };
            imageObj.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function enableScaleDrawing() {
    let isDrawing = false;

    stage.on('mousedown touchstart', (e) => {
        if (!scaleFactor) {
            isDrawing = true;
            const pos = stage.getPointerPosition();
            startPoint = pos;
            if (line) {
                line.destroy();
            }
            line = new Konva.Line({
                points: [startPoint.x, startPoint.y],
                stroke: '#3B82F6',
                strokeWidth: 3,
                lineCap: 'round',
                lineJoin: 'round',
            });
            layer.add(line);
        }
    });

    stage.on('mousemove touchmove', (e) => {
        if (isDrawing && !scaleFactor) {
            const pos = stage.getPointerPosition();
            line.points([startPoint.x, startPoint.y, pos.x, pos.y]);
            layer.draw();
        }
    });

    stage.on('mouseup touchend', (e) => {
        if (isDrawing && !scaleFactor) {
            isDrawing = false;
            endPoint = stage.getPointerPosition();
            // Show the distance input and Set Scale button
            distanceInputWrapper.style.display = 'flex';
        }
    });
}

setScaleBtn.addEventListener('click', () => {
    const lineLengthMeters = parseFloat(document.getElementById('lineLength').value);
    if (isNaN(lineLengthMeters) || !startPoint || !endPoint) {
        alert("Please draw a line and enter a valid distance in meters.");
        return;
    }

    const pixelDistance = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));

    scaleFactor = pixelDistance / lineLengthMeters;

    if (line) {
        line.destroy();
        layer.draw();
    }

    // Hide the scale steps and button
    const stepsSection = document.querySelector('.steps');
    stepsSection.style.display = 'none';

    furnitureControls.classList.add('active'); // Show furniture controls
});

addFurnitureBtn.addEventListener('click', () => {
    if (!scaleFactor) {
        alert("Please set the scale first.");
        return;
    }

    const furnitureName = document.getElementById('furnitureName').value.trim();
    const furnitureWidthMeters = parseFloat(document.getElementById('furnitureWidth').value);
    const furnitureHeightMeters = parseFloat(document.getElementById('furnitureHeight').value);

    if (isNaN(furnitureWidthMeters) || isNaN(furnitureHeightMeters)) {
        alert("Please enter valid furniture dimensions.");
        return;
    }

    const furnitureWidthPixels = furnitureWidthMeters * scaleFactor;
    const furnitureHeightPixels = furnitureHeightMeters * scaleFactor;

    const rect = new Konva.Rect({
        x: stage.width() / 2 - furnitureWidthPixels / 2,
        y: stage.height() / 2 - furnitureHeightPixels / 2,
        width: furnitureWidthPixels,
        height: furnitureHeightPixels,
        fill: '#60A5FA',
        stroke: 'black',
        strokeWidth: 1,
        draggable: true,
    });

    let text = null;
    if (furnitureName) {
        // Calculate the maximum font size that fits the width and height
        const maxWidthFontSize = furnitureWidthPixels / furnitureName.length * 1.5;
        const maxHeightFontSize = furnitureHeightPixels * 0.8;
        const fontSize = Math.min(maxWidthFontSize, maxHeightFontSize);

        // Ensure text does not exceed the width, adjusting for two lines if necessary
        const words = furnitureName.split(" ");
        let adjustedText = furnitureName;
        let adjustedFontSize = fontSize;

        if (fontSize < 10 && words.length > 1) {
            adjustedText = words.join("\n");  // Split into two lines
            adjustedFontSize = Math.min(furnitureWidthPixels / Math.max(...words.map(w => w.length)) * 1.5, maxHeightFontSize);
        } else if (fontSize < 10 && words.length === 1) {
            adjustedFontSize = 10; // Minimum font size
        }

        text = new Konva.Text({
            text: adjustedText,
            fontSize: adjustedFontSize,
            fontFamily: 'Arial',
            fill: 'white',
            width: rect.width(),
            align: 'center',
            listening: false,
        });

        layer.add(rect);
        layer.add(text);

        text.position({
            x: rect.x(),
            y: rect.y() + (rect.height() - text.height()) / 2,
        });

        rect.on('dragmove', () => {
            text.position({
                x: rect.x(),
                y: rect.y() + (rect.height() - text.height()) / 2,
            });
            layer.batchDraw();
        });

        text.on('click dragstart', (e) => {
            e.cancelBubble = true;
        });
    }

    rect.on('click dragstart', (e) => {
        e.cancelBubble = true;

        if (selectedFurniture) {
            selectedFurniture.rect.fill('#60A5FA');
        }
        rect.fill('#93C5FD');
        selectedFurniture = { rect, text };
        layer.draw();
    });

    layer.draw();
});


// Handle keyboard events for copy, paste, and delete
window.addEventListener('keydown', (e) => {
    if (selectedFurniture) {
        if (e.key === 'Backspace') { // Delete selected furniture
            selectedFurniture.rect.destroy();
            if (selectedFurniture.text) {
                selectedFurniture.text.destroy();
            }
            layer.draw();
            selectedFurniture = null;
        } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) { // Copy selected furniture
            copiedFurniture = {
                name: selectedFurniture.text ? selectedFurniture.text.text() : "",
                width: selectedFurniture.rect.width(),
                height: selectedFurniture.rect.height(),
                x: selectedFurniture.rect.x(),
                y: selectedFurniture.rect.y(),
            };
        } else if (e.key === 'v' && (e.ctrlKey || e.metaKey) && copiedFurniture) { // Paste copied furniture
            const newRect = new Konva.Rect({
                x: copiedFurniture.x + 20,
                y: copiedFurniture.y + 20,
                width: copiedFurniture.width,
                height: copiedFurniture.height,
                fill: '#60A5FA',
                stroke: 'black',
                strokeWidth: 1,
                draggable: true,
            });

            let newText = null;
            if (copiedFurniture.name) {
                // Apply the same font size logic as before
                const maxWidthFontSize = newRect.width() / copiedFurniture.name.length * 1.5;
                const maxHeightFontSize = newRect.height() * 0.8;
                const fontSize = Math.min(maxWidthFontSize, maxHeightFontSize);
                
                // Ensure text does not exceed the width, adjusting for two lines if necessary
                const words = copiedFurniture.name.split(" ");
                let adjustedText = copiedFurniture.name;
                let adjustedFontSize = fontSize;
                
                if (fontSize < 10 && words.length > 1) {
                    adjustedText = words.join("\n");  // Split into two lines
                    adjustedFontSize = Math.min(newRect.width() / Math.max(...words.map(w => w.length)) * 1.5, maxHeightFontSize);
                } else if (fontSize < 10 && words.length === 1) {
                    adjustedFontSize = 10; // Minimum font size
                }

                newText = new Konva.Text({
                    text: adjustedText,
                    fontSize: adjustedFontSize,
                    fontFamily: 'Arial',
                    fill: 'white',
                    width: newRect.width(),
                    align: 'center',
                    listening: false,
                });

                layer.add(newRect);
                layer.add(newText);

                newText.position({
                    x: newRect.x(),
                    y: newRect.y() + (newRect.height() - newText.height()) / 2,
                });

                newRect.on('dragmove', () => {
                    newText.position({
                        x: newRect.x(),
                        y: newRect.y() + (newRect.height() - newText.height()) / 2,
                    });
                    layer.batchDraw();
                });

                newText.on('click dragstart', (e) => {
                    e.cancelBubble = true;
                });
            }

            newRect.on('click dragstart', (e) => {
                e.cancelBubble = true;

                if (selectedFurniture) {
                    selectedFurniture.rect.fill('#60A5FA'); // Revert to original color
                }
                newRect.fill('#93C5FD'); // Highlight selected furniture
                selectedFurniture = { rect: newRect, text: newText };
                layer.draw();
            });

            layer.draw();
        }
    }
});
