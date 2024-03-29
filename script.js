var MOUSE_LEFT = 0,
  MOUSE_RIGHT = 2,
  KEY_DEL = 46;

var x1 = 0,
  y1 = 0,
  x2 = 0,
  y2 = 0;

var selectedElement = null;
var shape = "rectangle";
var editor = document.getElementById("editor");
var selectionRectangle = document.getElementById("selectionRectangle");
var elements = document.getElementById("elements");
var selectionEllipse = document.getElementById("selectionEllipse");
var selectionLine = document.getElementById("selectionLine");
var color = document.getElementById("color");
var lineWidth = document.getElementById("lineWidth");
var undo = document.getElementById("undo");
var exportSvg = document.getElementById("exportSVG");
var restore = document.getElementById("restore");

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

var actionsStack = [];

function addAction(action) {
  actionsStack.push(action);
}

document.getElementById("rectangle").onclick = () => {
  shape = "rectangle";
};

document.getElementById("ellipse").onclick = () => {
  shape = "ellipse";
};

document.getElementById("line").onclick = () => {
  shape = "line";
};

color.onchange = (e) => {
  if (selectedElement) {
    var oldFill = selectedElement.style.fill;
    var oldStroke = selectedElement.style.stroke;

    addAction({
      type: "styleChange",
      element: selectedElement,
      oldFill: oldFill,
      oldStroke: oldStroke,
    });

    selectedElement.style.fill = e.target.value;

    if (selectedElement.tagName.toLowerCase() === "line") {
      selectedElement.style.stroke = e.target.value;
    } else {
      selectedElement.style.stroke = "black";
    }

    selectedElement.setAttribute(
      "data-original-fill",
      selectedElement.style.fill
    );
    selectedElement.setAttribute(
      "data-original-stroke",
      selectedElement.style.stroke
    );
  }
};

lineWidth.onchange = (e) => {
  if (selectedElement) {
    var oldStrokeWidth = selectedElement.getAttributeNS(null, "stroke-width");

    addAction({
      type: "strokeChange",
      element: selectedElement,
      oldStrokeWidth: oldStrokeWidth,
    });

    selectedElement.setAttributeNS(null, "stroke-width", e.target.value);
  }
};

undo.onclick = (e) => {
  if (actionsStack.length > 0) {
    var actionToUndo = actionsStack.pop();
    switch (actionToUndo.type) {
      case "add":
        actionToUndo.element.remove();
        break;
      case "delete":
        actionToUndo.parent.appendChild(actionToUndo.element);
        break;
      case "styleChange":
        actionToUndo.element.style.fill = actionToUndo.oldFill;
        actionToUndo.element.style.stroke = actionToUndo.oldStroke;
        break;
      case "strokeChange":
        actionToUndo.element.setAttributeNS(
          null,
          "stroke-width",
          actionToUndo.oldStrokeWidth
        );
        break;
      case "dragRectangle":
        actionToUndo.element.setAttributeNS(null, "x", actionToUndo.initialX);
        actionToUndo.element.setAttributeNS(null, "y", actionToUndo.initialY);
        break;
      case "dragEllipse":
        actionToUndo.element.setAttributeNS(null, "cx", actionToUndo.initialCX);
        actionToUndo.element.setAttributeNS(null, "cy", actionToUndo.initialCY);
        break;
      case "dragLine":
        actionToUndo.element.setAttributeNS(null, "x1", actionToUndo.initialX1);
        actionToUndo.element.setAttributeNS(null, "x2", actionToUndo.initialX2);
        actionToUndo.element.setAttributeNS(null, "y1", actionToUndo.initialY1);
        actionToUndo.element.setAttributeNS(null, "y2", actionToUndo.initialY2);
        break;
      default:
        break;
    }
  }
  saveDrawing();
};

function setRectangleCoordinates(object, x1, y1, x2, y2) {
  object.setAttributeNS(null, "x", Math.min(x1, x2));
  object.setAttributeNS(null, "y", Math.min(y1, y2));
  object.setAttributeNS(null, "width", Math.max(x1, x2) - Math.min(x1, x2));
  object.setAttributeNS(null, "height", Math.max(y1, y2) - Math.min(y1, y2));
  object.setAttributeNS(null, "stroke-width", lineWidth.value);
}

function setEllipseCoordinates(object, x1, y1, x2, y2) {
  object.setAttributeNS(null, "cx", (x1 + x2) / 2);
  object.setAttributeNS(null, "cy", (y1 + y2) / 2);
  object.setAttributeNS(null, "rx", Math.abs(x1 - x2) / 2);
  object.setAttributeNS(null, "ry", Math.abs(y1 - y2) / 2);
  object.setAttributeNS(null, "stroke-width", lineWidth.value);
}

function setLineCoordinates(object, x1, y1, x2, y2) {
  object.setAttributeNS(null, "x1", x1);
  object.setAttributeNS(null, "y1", y1);
  object.setAttributeNS(null, "x2", x2);
  object.setAttributeNS(null, "y2", y2);
  object.setAttributeNS(null, "stroke-width", lineWidth.value);
}

editor.onmousedown = function (e) {
  if (e.button == MOUSE_LEFT) {
    x1 = e.pageX - this.getBoundingClientRect().left;
    y1 = e.pageY - this.getBoundingClientRect().top;
    switch (shape) {
      case "rectangle":
        setRectangleCoordinates(selectionRectangle, x1, y1, x2, y2);
        selectionRectangle.style.display = "block";
        break;
      case "ellipse":
        setEllipseCoordinates(selectionEllipse, x1, y1, x2, y2);
        selectionEllipse.style.display = "block";
        break;
      case "line":
        setLineCoordinates(selectionLine, x1, y1, x2, y2);
        selectionLine.style.display = "block";
        break;
      default:
        break;
    }
  } else if (e.button === MOUSE_RIGHT && selectedElement) {
    isDragging = true;

    switch (selectedElement.tagName.toLowerCase()) {
      case "ellipse":
        addAction({
          type: "dragEllipse",
          element: selectedElement,
          initialCX: selectedElement.getAttributeNS(null, "cx"),
          initialCY: selectedElement.getAttributeNS(null, "cy"),
        });

        const cx = parseFloat(selectedElement.getAttributeNS(null, "cx"));
        const cy = parseFloat(selectedElement.getAttributeNS(null, "cy"));
        offsetX = e.pageX - cx;
        offsetY = e.pageY - cy;
        break;
      case "line":
        addAction({
          type: "dragLine",
          element: selectedElement,
          initialX1: selectedElement.getAttributeNS(null, "x1"),
          initialY1: selectedElement.getAttributeNS(null, "y1"),
          initialX2: selectedElement.getAttributeNS(null, "x2"),
          initialY2: selectedElement.getAttributeNS(null, "y2"),
        });

        offsetX =
          e.pageX - parseFloat(selectedElement.getAttributeNS(null, "x1"));
        offsetY =
          e.pageY - parseFloat(selectedElement.getAttributeNS(null, "y1"));
        break;
      default:
        addAction({
          type: "dragRectangle",
          element: selectedElement,
          initialX: selectedElement.getAttributeNS(null, "x"),
          initialY: selectedElement.getAttributeNS(null, "y"),
        });

        offsetX =
          e.pageX - parseFloat(selectedElement.getAttributeNS(null, "x"));
        offsetY =
          e.pageY - parseFloat(selectedElement.getAttributeNS(null, "y"));
        break;
    }
  }
};

editor.onmouseup = function (e) {
  if (e.button == MOUSE_LEFT) {
    switch (shape) {
      case "rectangle":
        selectionRectangle.style.display = "none";
        var newElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        setRectangleCoordinates(newElement, x1, y1, x2, y2);
        break;
      case "ellipse":
        selectionEllipse.style.display = "none";
        var newElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "ellipse"
        );
        setEllipseCoordinates(newElement, x1, y1, x2, y2);
        break;
      case "line":
        selectionLine.style.display = "none";
        var newElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );
        setLineCoordinates(newElement, x1, y1, x2, y2);
        break;
      default:
        break;
    }

    elements.appendChild(newElement);
    var childElements = document.querySelectorAll("#elements *");
    childElements.forEach((el) => {
      el.classList.remove("selected");
    });

    newElement.onmousedown = function (e) {
      if (e.button == MOUSE_RIGHT) {
        offsetX = e.pageX - this.getAttributeNS(null, "x");
        offsetY = e.pageY - this.getAttributeNS(null, "y");

        var childElements = document.querySelectorAll("#elements *");
        childElements.forEach((el) => {
          el.classList.remove("selected");
          el.style.fill = el.getAttribute("data-original-fill");
          el.style.stroke = el.getAttribute("data-original-stroke");
        });

        this.classList.add("selected");
        selectedElement = this;
        selectedElement.setAttributeNS(null, "stroke-width", lineWidth.value);
        selectedElement.setAttribute(
          "data-original-fill",
          selectedElement.style.fill
        );
        selectedElement.setAttribute(
          "data-original-stroke",
          selectedElement.style.stroke
        );
        selectedElement.style.fill = "blueviolet";
        selectedElement.style.stroke = "blueviolet";

        addAction({
          type: "styleChange",
          element: selectedElement,
          oldFill: selectedElement.getAttribute("data-original-fill"),
          oldStroke: selectedElement.getAttribute("data-original-stroke"),
        });
      }
    };

    addAction({
      type: "add",
      element: newElement,
    });
  } else if (e.button === MOUSE_RIGHT) {
    if (isDragging) {
      isDragging = false;
    }
  }
  saveDrawing();
};

editor.onmousemove = function (e) {
  if (isDragging && selectedElement) {
    const newX = e.pageX - offsetX;
    const newY = e.pageY - offsetY;

    switch (selectedElement.tagName.toLowerCase()) {
      case "rect":
        selectedElement.setAttributeNS(null, "x", newX);
        selectedElement.setAttributeNS(null, "y", newY);
        break;
      case "ellipse":
        selectedElement.setAttributeNS(
          null,
          "cx",
          parseFloat(selectedElement.getAttributeNS(null, "cx")) +
            (newX - parseFloat(selectedElement.getAttributeNS(null, "cx")))
        );
        selectedElement.setAttributeNS(
          null,
          "cy",
          parseFloat(selectedElement.getAttributeNS(null, "cy")) +
            (newY - parseFloat(selectedElement.getAttributeNS(null, "cy")))
        );
        break;
      case "line":
        const dx =
          parseFloat(selectedElement.getAttributeNS(null, "x2")) -
          parseFloat(selectedElement.getAttributeNS(null, "x1"));
        const dy =
          parseFloat(selectedElement.getAttributeNS(null, "y2")) -
          parseFloat(selectedElement.getAttributeNS(null, "y1"));

        selectedElement.setAttributeNS(null, "x1", newX);
        selectedElement.setAttributeNS(null, "y1", newY);
        selectedElement.setAttributeNS(null, "x2", newX + dx);
        selectedElement.setAttributeNS(null, "y2", newY + dy);
        break;
      default:
        break;
    }
  }

  x2 = e.pageX - this.getBoundingClientRect().left;
  y2 = e.pageY - this.getBoundingClientRect().top;
  setRectangleCoordinates(selectionRectangle, x1, y1, x2, y2);
  setEllipseCoordinates(selectionEllipse, x1, y1, x2, y2);
  setLineCoordinates(selectionLine, x1, y1, x2, y2);
};

function saveDrawing() {
  const elements = document.getElementById("elements").innerHTML;
  localStorage.setItem("savedDrawing", elements);
}

document.onkeydown = function (e) {
  if (e.keyCode === KEY_DEL && selectedElement) {
    addAction({
      type: "delete",
      element: selectedElement.cloneNode(true),
      parent: selectedElement.parentElement,
    });
    selectedElement.remove();
    saveDrawing();
  }
};

editor.oncontextmenu = function (e) {
  e.preventDefault();
};

exportSvg.onclick = () => {
  const svgData = new XMLSerializer().serializeToString(editor);

  const link = document.createElement("a");
  const blob = new Blob([svgData], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = "svg_editor.svg";
  link.click();
  URL.revokeObjectURL(url);
};

restore.onclick = () => {
  const savedDrawing = localStorage.getItem("savedDrawing");
  if (savedDrawing) {
    elements.innerHTML = savedDrawing;
    var childElements = document.querySelectorAll("#elements *");
    childElements.forEach((el) => {
      el.onmousedown = function (e) {
        if (e.button == MOUSE_RIGHT) {
          offsetX = e.pageX - this.getAttributeNS(null, "x");
          offsetY = e.pageY - this.getAttributeNS(null, "y");

          var childElements = document.querySelectorAll("#elements *");
          childElements.forEach((el) => {
            el.classList.remove("selected");
            el.style.fill = el.getAttribute("data-original-fill");
            el.style.stroke = el.getAttribute("data-original-stroke");
          });

          this.classList.add("selected");
          selectedElement = this;
          selectedElement.setAttributeNS(null, "stroke-width", lineWidth.value);
          selectedElement.setAttribute(
            "data-original-fill",
            selectedElement.style.fill
          );
          selectedElement.setAttribute(
            "data-original-stroke",
            selectedElement.style.stroke
          );
          selectedElement.style.fill = "blueviolet";
          selectedElement.style.stroke = "blueviolet";

          addAction({
            type: "styleChange",
            element: selectedElement,
            oldFill: selectedElement.getAttribute("data-original-fill"),
            oldStroke: selectedElement.getAttribute("data-original-stroke"),
          });
        }
      };
    });
    alert("Drawing restored successfully!");
  } else {
    alert("No saved drawing found.");
  }
};
