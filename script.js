const uploadBtn = document.getElementById('uploadBtn');
const container = document.getElementById('container');
const placeholderImage = document.getElementById('placeholderImage');
const distanceInputWrapper = document.getElementById('distanceInputWrapper');
const setScaleBtn = document.getElementById('setScaleBtn');
const furnitureControls = document.getElementById('furnitureControls');
const addRectangularFurnitureBtn = document.getElementById('addRectangularFurnitureBtn');
const addRoundFurnitureBtn = document.getElementById('addRoundFurnitureBtn');
let stage, layer, konvaImage;
let scaleFactor = null;
let line, startPoint, endPoint;
let selectedFurniture = null;
let copiedFurniture = null;

uploadBtn.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imageObj = new Image();
            imageObj.onload = function () {
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
                        selectedFurniture.shape.fill('#60A5FA');
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

    const stepsSection = document.querySelector('.steps');
    stepsSection.style.display = 'none';

    const furnitureControls = document.getElementById('furnitureControls');
    furnitureControls.classList.add('active'); // Show furniture controls after setting the scale
});

addRectangularFurnitureBtn.addEventListener('click', () => {
    if (!scaleFactor) {
        alert("Please set the scale first.");
        return;
    }

    const furnitureName = document.getElementById('furnitureName').value.trim();
    const furnitureWidthMeters = parseFloat(document.getElementById('furnitureWidth').value);
    const furnitureLengthMeters = parseFloat(document.getElementById('furnitureLength').value);

    if (isNaN(furnitureWidthMeters) || isNaN(furnitureLengthMeters)) {
        alert("Please enter valid furniture dimensions.");
        return;
    }

    const furnitureWidthPixels = furnitureWidthMeters * scaleFactor;
    const furnitureLengthPixels = furnitureLengthMeters * scaleFactor;

    const rect = new Konva.Rect({
        x: stage.width() / 2 - furnitureWidthPixels / 2,
        y: stage.height() / 2 - furnitureLengthPixels / 2,
        width: furnitureWidthPixels,
        height: furnitureLengthPixels,
        fill: '#60A5FA',
        stroke: 'black',
        strokeWidth: 1,
        draggable: true,
    });

    layer.add(rect);
    layer.draw();

    const text = addTextToShape(rect, furnitureName, furnitureWidthPixels, furnitureLengthPixels);

    rect.on('click dragstart', (e) => {
        e.cancelBubble = true;
        selectFurniture(rect, text);
    });

    rect.on('dragmove', () => {
        text.position({
            x: rect.x() + rect.width() / 2 - text.width() / 2,
            y: rect.y() + rect.height() / 2 - text.height() / 2,
        });
        layer.batchDraw();
    });
});

addRoundFurnitureBtn.addEventListener('click', () => {
    if (!scaleFactor) {
        alert("Please set the scale first.");
        return;
    }

    const furnitureName = document.getElementById('furnitureName').value.trim();
    const furnitureDiameterMeters = parseFloat(document.getElementById('furnitureDiameter').value);

    if (isNaN(furnitureDiameterMeters)) {
        alert("Please enter a valid diameter.");
        return;
    }

    const furnitureDiameterPixels = furnitureDiameterMeters * scaleFactor;

    const circle = new Konva.Circle({
        x: stage.width() / 2,
        y: stage.height() / 2,
        radius: furnitureDiameterPixels / 2,
        fill: '#60A5FA',
        stroke: 'black',
        strokeWidth: 1,
        draggable: true,
    });

    layer.add(circle);
    layer.draw();

    const text = addTextToShape(circle, furnitureName, furnitureDiameterPixels, furnitureDiameterPixels);

    circle.on('click dragstart', (e) => {
        e.cancelBubble = true;
        selectFurniture(circle, text);
    });

    circle.on('dragmove', () => {
        text.position({
            x: circle.x() - text.width() / 2,
            y: circle.y() - text.height() / 2,
        });
        layer.batchDraw();
    });
});

function addTextToShape(shape, textValue, widthPixels, heightPixels) {
    let text = null;
    if (textValue) {
        const fontSize = Math.min(widthPixels / textValue.length * 1.5, heightPixels * 0.8);

        text = new Konva.Text({
            text: textValue,
            fontSize: fontSize,
            fontFamily: 'Arial',
            fill: 'white',
            align: 'center',
            width: widthPixels,  // Set the text width to be the same as the shape's width
            listening: false,
        });

        // Position the text based on the shape's position and dimensions
        if (shape instanceof Konva.Rect) {
            text.position({
                x: shape.x() + shape.width() / 2 - text.width() / 2,
                y: shape.y() + shape.height() / 2 - text.height() / 2,
            });
        } else if (shape instanceof Konva.Circle) {
            text.position({
                x: shape.x() - text.width() / 2,
                y: shape.y() - text.height() / 2,
            });
        }

        layer.add(text);
        layer.batchDraw();
    }
    return text;
}

function selectFurniture(shape, text) {
    if (selectedFurniture) {
        selectedFurniture.shape.fill('#60A5FA');
    }

    shape.fill('#93C5FD');
    selectedFurniture = { shape, text };
    layer.draw();
}

// Handle keyboard events for copy, paste, and delete
window.addEventListener('keydown', (e) => {
    // Check if the focused element is an input field
    const activeElement = document.activeElement;
    const isTextInput = (activeElement.tagName === 'INPUT' && 
                        (activeElement.type === 'text' || activeElement.type === 'number'));

    if (selectedFurniture && !isTextInput) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            selectedFurniture.shape.destroy();
            if (selectedFurniture.text) {
                selectedFurniture.text.destroy();
            }
            layer.draw();
            selectedFurniture = null;
        } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            copiedFurniture = {
                type: selectedFurniture.shape.className,
                x: selectedFurniture.shape.x(),
                y: selectedFurniture.shape.y(),
                width: selectedFurniture.shape.width ? selectedFurniture.shape.width() : null,
                height: selectedFurniture.shape.height ? selectedFurniture.shape.height() : null,
                radius: selectedFurniture.shape.radius ? selectedFurniture.shape.radius() : null,
                text: selectedFurniture.text ? selectedFurniture.text.text() : null,
            };
        } else if (e.key === 'v' && (e.ctrlKey || e.metaKey) && copiedFurniture) {
            let newShape, newText;

            if (copiedFurniture.type === 'Rect') {
                newShape = new Konva.Rect({
                    x: copiedFurniture.x + 20,
                    y: copiedFurniture.y + 20,
                    width: copiedFurniture.width,
                    height: copiedFurniture.height,
                    fill: '#60A5FA',
                    stroke: 'black',
                    strokeWidth: 1,
                    draggable: true,
                });

                layer.add(newShape);
                layer.draw();

                newText = addTextToShape(newShape, copiedFurniture.text, copiedFurniture.width, copiedFurniture.height);
            } else if (copiedFurniture.type === 'Circle') {
                newShape = new Konva.Circle({
                    x: copiedFurniture.x + 20,
                    y: copiedFurniture.y + 20,
                    radius: copiedFurniture.radius,
                    fill: '#60A5FA',
                    stroke: 'black',
                    strokeWidth: 1,
                    draggable: true,
                });

                layer.add(newShape);
                layer.draw();

                newText = addTextToShape(newShape, copiedFurniture.text, copiedFurniture.radius * 2, copiedFurniture.radius * 2);
            }

            newShape.on('click dragstart', (e) => {
                e.cancelBubble = true;
                selectFurniture(newShape, newText);
            });

            newShape.on('dragmove', () => {
                if (newShape instanceof Konva.Rect) {
                    newText.position({
                        x: newShape.x() + newShape.width() / 2 - newText.width() / 2,
                        y: newShape.y() + newShape.height() / 2 - newText.height() / 2,
                    });
                } else if (newShape instanceof Konva.Circle) {
                    newText.position({
                        x: newShape.x() - newText.width() / 2,
                        y: newShape.y() - newText.height() / 2,
                    });
                }
                layer.batchDraw();
            });

            layer.add(newShape);
            layer.add(newText);  // Ensure the text is added to the layer immediately
            layer.draw();
        }
    }
});
