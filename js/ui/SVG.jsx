import {UI} from "UIBase";
import "UIPrimitives";
import * as math from "math";
import {CreateAllowedAttributesMap} from "DOMAttributes";
import {Color} from "Color";
import {Transition} from "Transition";

UI.SVG = {};

const FIREFOX_SVG_STYLE_ELEMENTS = [
    "width", "height", "rx", "ry", "cx", "cy", "x", "y"
];

UI.SVG.Element = class SVGElement extends UI.Element {
    createNode() {
        this.node = document.createElementNS("http://www.w3.org/2000/svg", this.getPrimitiveTag());
        return this.node;
    }

    setOptions(options) {
        if (options.hasOwnProperty("style")) {
            for (let attributeName of FIREFOX_SVG_STYLE_ELEMENTS) {
                if (options.style.hasOwnProperty(attributeName) && !options.hasOwnProperty(attributeName)) {
                    options[attributeName] = options.style[attributeName];
                }
            }
        }
        if (this.constructor.getDefaultOptions) {
            let defaultOptions = this.constructor.getDefaultOptions();
            // TODO: use object.assign and make sure everything work on the right level
            options = $.extend(true, {}, defaultOptions, options);
        }

        super.setOptions(options);
    }

    saveState() {
        let state = {};
        state.options = $.extend(true, {}, this.options);
        return state;
    }

    setStyle(attributeName, value) {
        super.setStyle(attributeName, value);
        // TODO: WTF, in operator? use a Map!
        if (attributeName in FIREFOX_SVG_STYLE_ELEMENTS) {
            this.options[attributeName] = value;
            this.setAttribute(attributeName, value);
            this.redraw();
        }
    }

    setState(state) {
        this.setOptions(state.options);
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        attr.classes = null;

        let transform = this.getTransform();
        if (transform) {
            attr.setAttribute("transform", transform);
        }

        return attr;
    }

    getTransform() {
        if (this.options.transform) {
            return this.options.transform;
        }
        if (this.options.translate) {
            return this.options.translate;
        }
        return null;
    }

    translate(x=0, y=0) {
        this.options.translate = "translate(" + x + "," + y + ")";
    }

    getHashCode() {
        return this.uniqueId();
    }

    //TODO(@all) : getBoundingClientRect is unreliable, reimplement it.
    getBoundingClientRect() {
        let element = this.node;
        let x = 0;
        let y = 0;
        while(element && element !== document.body) {
            x -= element.scrollLeft;
            y -= element.scrollTop;
            element = element.offsetParent || element.parentNode;
        }
        if (element) {
            x -= element.scrollLeft;
            y -= element.scrollTop;
        }
        let pos = this.node.getBoundingClientRect();
        return {
            top: pos.top - y,
            left: pos.left - x,
            width: pos.width,
            bottom: pos.bottom - y,
            height: pos.height,
            right: pos.right - x
        };
    }

    getBBox() {
        return this.node.getBBox();
    }

    getHeight() {
        return this.getBoundingClientRect().height;
    }

    getWidth() {
        return this.getBoundingClientRect().width;
    }

    toFront() {
    }

    toBack() {
    }

    setOpacity(newOpacity) {
        this.options.opacity = newOpacity;
        if (this.node) {
            this.node.setAttribute("opacity", newOpacity);
        }
    }

    setColor(color) {
        this.options.color = color;
        if (this.node) {
            this.node.setAttribute("stroke", color);
            this.node.setAttribute("fill", color)
        }
    }

    blinkTransition(options) {
        let config = {
            duration: 2000,
            times: 2,
            firstColor: "grey",
            secondColor: "black",
            executeLastStep: true,
            startTime: 0,
            dependsOn: []
        };
        Object.assign(config, options);
        return new Transition({
            func: (t, context) => {
                if (t > 1 - context.interval && !context.executeLastStep) {
                    this.setColor(context.firstColor);
                } else {
                    this.setColor(Math.floor((1 - t) / context.interval) % 2 === 1 ? context.firstColor : context.secondColor);
                }
            },
            context: {
                firstColor: config.firstColor,
                secondColor: config.secondColor,
                interval: 1 / (2 * config.times),
                executeLastStep: config.executeLastStep
            },
            duration: config.duration,
            startTime: config.startTime,
            dependsOn: config.dependsOn
        });
    }

    changeOpacityTransition(opacity, duration, dependsOn=[], startTime=0) {
        if (!this.options.hasOwnProperty("opacity")) {
            this.options.opacity = 1;
        }
        return new Transition({
            func: (t, context) => {
                this.setOpacity((1 - t) * context.opacity + t * opacity);
            },
            context: {
                opacity: this.options.opacity
            },
            duration: duration,
            startTime: startTime,
            dependsOn: dependsOn
        });
    }

    changeColorTransition(color, duration, dependsOn=[], startTime=0) {
        return new Transition({
            func: (t, context) => {
                this.setColor(Color.interpolate(context.color, color, t));
            },
            context: {
                color: this.getColor()
            },
            duration: duration,
            startTime: startTime,
            dependsOn: dependsOn
        });
    }

    remove() {
    }

    getSvg() {
        return this.parent.getSvg();
    }

    getRaphael() {
        if (!this.hasOwnProperty("_raphael")) {
            this._raphael = this.createRaphael();
            this._raphael.node.remove();
            this._raphael.node = this.node;
        }
        return this._raphael;
    }

    getSnap() {
        if (!this.hasOwnProperty("_snap")) {
            this._snap = this.createSnap();
            this._snap.node.remove();
            this._snap.node = this.node;
        }
        return this._snap;
    }
};

UI.SVG.Element.domAttributesMap = CreateAllowedAttributesMap(UI.Element.domAttributesMap, [
    ["fill"],
    ["height"],
    ["opacity"],
    ["stroke"],
    ["strokeWidth", {domName: "stroke-width"}],
    ["clipPath", {domName: "clip-path"}],
    ["transform"],
    ["width"],
    ["cx"],
    ["cy"],
    ["rx"],
    ["ry"],
    ["x"],
    ["y"],
    ["offset"],
    ["stopColor", {domName: "stop-color"}],
    ["strokeDasharray", {domName: "stroke-dasharray"}],
    ["strokeLinecap", {domName: "stroke-linecap"}]
]);

UI.SVG.SVGRoot = class SVGRoot extends UI.SVG.Element {
    getPrimitiveTag() {
        return "svg";
    }

    getSnap() {
        return Snap(this.node);
    }

    getSvg() {
        return this;
    }
};

UI.SVG.RawSVG = class RawSVG extends UI.SVG.SVGRoot {
    redraw() {
        super.redraw();
        this.node.innerHTML = this.options.innerHTML;
    }
};

UI.SVG.Group = class SVGGroup extends UI.SVG.Element {
    getPrimitiveTag() {
        return "g";
    }

    setColor(color) {
        for (let i = 0; i < this.children.length; i += 1) {
            this.children[i].setColor(color);
        }
    }
};

UI.SVG.Defs = class SVGDefs extends UI.SVG.Element {
    getPrimitiveTag() {
        return "defs";
    }
};

UI.SVG.ClipPath = class ClipPath extends UI.SVG.Element {
    getPrimitiveTag() {
        return "clipPath";
    }
};

UI.SVG.Path = class SVGPath extends UI.SVG.Element {
    getPrimitiveTag() {
        return "path";
    }

    static getDefaultOptions() {
        return {
            d: ""
        }
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        attr.setAttribute("d", this.getPath());
        return attr;
    }

    createSnap() {
        return this.getSvg().getSnap().path();
    }

    getPath() {
        return this.options.d;
    }

    setPath(newPath) {
        this.options.d = newPath;
        this.node.setAttribute("d", this.options.d);
    }

    getLength() {
        return this.node.getTotalLength();
    }

    getPointAtLength(len) {
        return this.node.getPointAtLength(len);
    }
};

UI.SVG.Circle = class SVGCircle extends UI.SVG.Element {
    getPrimitiveTag() {
        return "circle";
    }

    static getDefaultOptions() {
        return {
            radius: 0,
            center: {x: 0, y: 0}
        };
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        attr.setAttribute("r", this.options.radius);
        attr.setAttribute("cx", this.options.center.x);
        attr.setAttribute("cy", this.options.center.y);
        return attr;
    }

    getRadius() {
        return this.options.radius;
    }

    setRadius(radius) {
        this.options.radius = radius;

        this.setAttribute("r", radius);
    }

    setCenter(x, y) {
        this.options.center.x = x;
        this.options.center.y = y;

        this.setAttribute("cx", x);
        this.setAttribute("cy", y);
    }

    getCenter() {
        return this.options.center;
    }

    toPath() {
        let r = this.options.radius;
        let cx = this.options.center.x;
        let cy = this.options.center.y;
        let pathString = "M" + (cx - r) + " " + cy +            // Starting point is W
                "a" + r + " " + r + " 0 0 1 " + r + " " + (-r) +    // Move to N
                "a" + r + " " + r + " 0 0 1 " + r + " " + r +       // Move to E
                "a" + r + " " + r + " 0 0 1 " + (-r) + " " + r +    // Move to S
                "a" + r + " " + r + " 0 0 1 " + (-r) + " " + (-r);  // Finally, move back to W
        return new UI.SVG.Path({d: pathString});
    }
};

UI.SVG.HandDrawnCircle = class SVGHandDrawnCircle extends UI.SVG.Element {
    getPrimitiveTag() {
        return "path";
    }

    static getDefaultOptions() {
        return {
            minDeltaR: 0.1,       // When the circle overlaps, the R decides the
            maxDeltaR: 0.1,        // ratio between the diameter of the circle and the
                                   // "imperfection" at its union, and DeltaR is the
                                   // difference between R and 1 (bigger -> more like a spiral)

            minStartingAngle: 0,   // Where the overlapping starts (0-360)
            maxStartingAngle: 0,

            minOverlap: 0.15,      // How much the circle goes over itself (ratio to circumference)
            maxOverlap: 0.15,

            minSquash: 0.7,        // How alike it is to an ellipse (1 is perfectly circular)
            maxSquash: 0.7,

            minSquashAngle: 150,      // Angle of the axis by which its elliptical
            maxSquashAngle: 150,

            r: 19,                  // Radius

            x: 0,                   // Center
            y: 0,

            fill: "transparent",
            stroke: "black",
            strokeWidth: "2px"
        }
    }

    setParameters(parameters) {
        Object.assign(this.options, parameters);
        this.setAttribute("d", this.getPath());
        this.setAttribute("transform", this.getTransform());
    }

    setCenter(x, y) {
        this.options.x = x;
        this.options.y = y;
        this.setAttribute("transform", this.getTransform());
    }
    setRadius(r) {
        this.options.r = r;
        this.setAttribute("d", this.getPath());
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        attr.setAttribute("d", this.getPath());
        attr.setAttribute("transform", this.getTransform());
        return attr;
    }

    getPath() {
        let r = this.options.r;
        let dR1 = this.options.minDeltaR;
        let dR2 = this.options.maxDeltaR;
        let minAngle = this.options.minStartingAngle;
        let maxAngle = this.options.maxStartingAngle;
        let minDAngle = this.options.minOverlap;
        let maxDAngle = this.options.maxOverlap;
        let c = 0.551915024494;
        let beta = Math.atan(c);
        let d = Math.sqrt(c*c+1);
        let alpha = (minAngle + Math.random()*(maxAngle - minAngle))*Math.PI/180;

        let path = 'M' + [r * Math.sin(alpha), r * Math.cos(alpha)];
        path += ' C' + [d * r * Math.sin(alpha + beta), d * r * Math.cos(alpha + beta)];

        for (let i = 0; i < 4; i += 1) {
            let dAngle = minDAngle + Math.random() * (maxDAngle - minDAngle);
            alpha += Math.PI/2 * (1 + dAngle);
            r *= (1 + dR1 + Math.random() * (dR2 - dR1));
            path += ' ' + (i ? 'S' : '') + [d * r * Math.sin(alpha - beta), d * r * Math.cos(alpha - beta)];
            path += ' ' + [r * Math.sin(alpha), r * Math.cos(alpha)];
        }

        return path;
    }

    getTransform() {
        let minL = this.options.minSquash;
        let maxL = this.options.maxSquash;
        let minAlpha = this.options.minSquashAngle;
        let maxAlpha = this.options.maxSquashAngle;
        let alpha = (minAlpha + Math.random() * (maxAlpha - minAlpha));
        let lambda = (minL + Math.random() * (maxL - minL));

        return 'translate(' + [this.options.x, this.options.y] + ') ' +
            'rotate(' + alpha + ') scale(1, ' + lambda + ') rotate(' + (-alpha) + ')';
    }
};

//TODO Complete this class
UI.SVG.Ellipse = class SVGEllipse extends UI.SVG.Element {
    getPrimitiveTag() {
        return "ellipse";
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        attr.setAttribute("rx", this.options.rx);
        attr.setAttribute("ry", this.options.ry);
        return attr;
    }
};

UI.SVG.CircleArc = class SVGCircleArc extends UI.SVG.Path {
    getPath() {
        let startAngle = this.options.startAngle;
        let endAngle = this.options.endAngle;
        let radius = this.options.radius;
        let center = this.options.center;

        var angleDiff = endAngle - startAngle + (endAngle < startAngle ? (2 * Math.PI) : 0);
        var startPoint = math.polarToCartesian(startAngle, radius, center);
        var endPoint = math.polarToCartesian(endAngle, radius, center);
        var sweepFlag;
        var largeArcFlag;

        // Set largeArcFlag and sweepFlag
        if (angleDiff <= Math.PI) {
            largeArcFlag = 0;
            if (math.crossProduct(startPoint, endPoint, center) <= 0) {
                sweepFlag = 0;
            } else {
                sweepFlag = 1;
            }
        } else {
            largeArcFlag = 1;
            if (math.crossProduct(startPoint, endPoint, center) <= 0) {
                sweepFlag = 1;
            } else {
                sweepFlag = 0;
            }
        }

        return "M " + startPoint.x + " " + startPoint.y +
            " A " + radius + " " + radius + " 0 " + largeArcFlag + " " + sweepFlag + " " +
            endPoint.x + " " + endPoint.y;
    }
};

UI.SVG.Rect = class SVGRect extends UI.SVG.Element {
    getPrimitiveTag() {
        return "rect";
    }

    static getDefaultOptions() {
        return {
            x: 0,
            y: 0,
            rx: 0,
            ry: 0,
            width: 0,
            height: 0
        };
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();

        attr.setAttribute("x", this.options.x);
        attr.setAttribute("y", this.options.y);
        attr.setAttribute("rx", this.options.rx);
        attr.setAttribute("ry", this.options.ry);
        attr.setAttribute("width", this.options.width);
        attr.setAttribute("height", this.options.height);

        return attr;
    }

    getX() {
        return this.options.x;
    }

    setX(x) {
        this.options.x = x;
        this.node.setAttribute("x", this.options.x);
    }

    getY() {
        return this.options.y;
    }

    setY(y) {
        this.options.y = y;
        this.node.setAttribute("y", this.options.y);
    }

    getWidth() {
        return this.options.width;
    }

    setWidth(width) {
        this.options.width = width;
        this.node.setAttribute("width", this.options.width);
    }

    getHeight() {
        return this.options.height;
    }

    setHeight(height) {
        this.options.height = height;
        this.node.setAttribute("height", this.options.height);
    }
};

UI.SVG.Line = class SVGLine extends UI.SVG.Element {
    getPrimitiveTag() {
        return "line";
    }

    static getDefaultOptions() {
        return {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            fill: "black",
            stroke: "black"
        };
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();

        attr.setAttribute("x1", this.options.x1);
        attr.setAttribute("y1", this.options.y1);
        attr.setAttribute("x2", this.options.x2);
        attr.setAttribute("y2", this.options.y2);

        return attr;
    }

    //TODO(@all): Make the getters for x1, y1, x2, y2

    setLine(x1, y1, x2, y2) {
        this.options.x1 = x1;
        this.options.y1 = y1;
        this.options.x2 = x2;
        this.options.y2 = y2;

        this.setAttribute("x1", x1);
        this.setAttribute("y1", y1);
        this.setAttribute("x2", x2);
        this.setAttribute("y2", y2);
    }
};

UI.SVG.Text = class SVGText extends UI.SVG.Element {
    getPrimitiveTag() {
        return "text";
    }

    static getDefaultOptions() {
        return {
            x: 0,
            y: 0,
            text: "",
            fontSize: "15px",
            color: "black",
            dy: "0.35em",
            textAnchor: "middle",
            selectable: false
        };
    }

    setOptions(options) {
        super.setOptions(options);
        if (!this.options.selectable) {
            if (!this.options.style) {
                this.options.style = {};
            }
            this.options.style["-webkit-user-select"] = "none";
            this.options.style["-moz-user-select"] = "none";
            this.options.style["-ms-user-select"] = "none";
            this.options.style["user-select"] = "none";
        }
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();

        let allowedAttrNames = new Map([
            ["dx", "dx"],
            ["dy", "dy"],
            ["fontSize", "font-size"],
            ["textAnchor", "text-anchor"],
            ["style", "style"]
        ]);
        for (let [key, value] of allowedAttrNames) {
            if (this.options.hasOwnProperty(key)) {
                attr.setAttribute(value, this.options[key]);
            }
        }

        attr.setAttribute("x", this.options.x);
        attr.setAttribute("y", this.options.y);

        return attr;
    }

    renderHTML() {
        return [<UI.TextElement ref="textElement" value={this.options.text + ""} />];
    }

    getX() {
        return this.options.x;
    }

    setX(x) {
        this.options.x = x;
        this.node.setAttribute("x", this.options.x);
    }

    getY() {
        return this.options.y;
    }

    setY(y) {
        this.options.y = y;
        this.node.setAttribute("y", this.options.y);
    }

    setText(text) {
        this.textElement.setValue(text + "");
        this.options.text = text;
        //this.redraw();
        // TODO: set the nodeValue of the child
        //this.children[0].node.nodeValue = value;
    }

    getText() {
        return this.options.text;
    }

    setPosition(x, y) {
        this.setX(x);
        this.setY(y);
    }

    getColor() {
        return this.options.color;
    }

    setColor(color, fillOnly=false) {
        this.options.color = color;
        if (this.node) {
            this.node.setAttribute("fill", color);
            if (!fillOnly) {
                this.node.setAttribute("stroke", color);
            }
        }
    }

    moveTransition(coords, duration, dependsOn=[], startTime=0) {
        return new Transition({
            func: (t, context) => {
                this.setPosition(
                    (1 - t) * context.x + t * coords.x,
                    (1 - t) * context.y + t * coords.y
                );
            },
            context: {
                x: this.options.x,
                y: this.options.y
            },
            duration: duration,
            startTime: startTime,
            dependsOn: dependsOn
        });
    }

    changeFillTransition(color, duration, dependsOn=[], startTime=0) {
        return new Transition({
            func: (t, context) => {
                this.setColor(Color.interpolate(context.color, color, t), true);
            },
            context: {
                color: this.getColor()
            },
            duration: duration,
            startTime: startTime,
            dependsOn: dependsOn
        });
    }
};

UI.SVG.Text.domAttributesMap = CreateAllowedAttributesMap(UI.SVG.Element.domAttributesMap, [
    ["fontFamily", {domName: "font-family"}]
]);

UI.SVG.TextArea = class SVGTextArea extends UI.SVG.Element {
    static getDefaultOptions() {
        return {
            padding: 0
        };
    }

    setOptions(options) {
        super.setOptions(options);
        this.rect = <UI.SVG.Rect/>;
        this.text = <UI.SVG.Text/>;
    }

    getX() {
        return this.rect.getX();
    }

    setX(x) {
        this.rect.setX(x);
        this.text.setX(x + this.options.padding);
    }

    getY() {
        return this.rect.getY();
    }

    setY(y) {
        this.rect.setY(y);
        this.text.setY(y + this.options.padding);
    }

    getWidth() {
        return this.rect.getWidth();
    }

    setWidth(width) {
        this.rect.setWidth(width);
        this.redraw();
    }

    getHeight() {
        return this.rect.getHeight();
    }

    setHeight(height) {
        this.rect.setHeight(height);
        this.redraw();
    }

    renderHTML() {

    }
};

UI.SVG.Polygon = class Polygon extends UI.SVG.Path {
    static getDefaultOptions() {
        return {
            points: []
        };
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        attr.setAttribute("d", this.getPolygonPath());
        return attr;
    }

    getPolygonPath() {
        let pathString = "";
        for (let i = 0; i < this.options.points.length; ++i) {
            if (i == 0) {
                pathString += "M ";
            }
            else {
                pathString += "L ";
            }
            pathString += this.options.points[i].x + " " + this.options.points[i].y + " ";
        }
        pathString += "Z";
        return pathString;
    }

    setPoints(points) {
        this.options.points = points;
        this.setPath(this.getPolygonPath());
    }
};

// TODO: move this somewhere else
UI.SVG.CSAIconPath = class SVGCSAIconPath extends UI.SVG.Path {
    setOptions(options) {
        this.options = options;
        this.options.x = options.x || "0";
        this.options.y = options.y || "0";
        this.options.size = options.size || 45;
        let ux = this.options.size / 1646;
        let uy = 0.8 * this.options.size / 1479;
        this.options.d = ' m '+(823)*ux +' '+(1194)*uy  +' l '+(0)*ux +' '+(-152)*uy  +' l '+(-191)*ux +' '+(0)*uy  +' l '+(191)*ux +' '+(-330)*uy  +' l '+(191)*ux +' '+(330)*uy  +' l '+(-191)*ux +' '+(0)*uy  +' l '+(0)*ux +' '+(152)*uy  +' l '+(257)*ux +' '+(0)*uy  +' l '+(173)*ux +' '+(100)*uy  +' a '+(194)*ux +' '+(194)*uy  + ' 0 1 0 '+(100)*ux +' '+(-173)*uy  +' l '+(-173)*ux +' '+(-100)*uy  +' l '+(-256)*ux +' '+(-464)*uy  +' l '+(0)*ux +' '+(-200)*uy  +' a '+(194)*ux +' '+(194)*uy  + ' 0 1 0 '+(-200)*ux +' '+(0)*uy  +' l '+(0)*ux +' '+(200)*uy  +' l '+(-256)*ux +' '+(464)*uy  +' l '+(-173)*ux +' '+(100)*uy  +' a '+(194)*ux +' '+(194)*uy  + ' 0 1 0 '+(100)*ux +' '+(173)*uy  +' l '+(173)*ux +' '+(-100)*uy  +'  z';
        this.options.fill = options.fill || "white";
        this.options.stroke = options.stroke || "none";
    }
};

UI.SVG.CSAIconSVG = class SVGCSAIconSVG extends UI.SVG.SVGRoot {
    setOptions(options) {
        this.options = options;
        this.options.size = this.options.size || 45;
        this.options.width = this.options.size;
        this.options.height = this.options.size;
    }

    renderHTML() {
        return [<UI.SVG.CSAIconPath size={this.options.size}/>];
    }
};

var SVG = UI.SVG;

export {SVG};