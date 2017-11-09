import {UI} from "../UIBase";
import {Device} from "../../base/Device";
import {registerStyle} from "../style/Theme";
import {unwrapArray} from "../../base/Utils";
import {DividerBar, SectionDivider} from "./SectionDivider";
import {TitledDividerStyle} from "./Style";
import {Orientation} from "../Constants";
import {FAIcon} from "../FontAwesome";



@registerStyle(TitledDividerStyle)
class TitledSectionDividerBar extends DividerBar {
    render() {
        if (this.options.orientation === Orientation.VERTICAL) {
            return [

                <FAIcon icon="ellipsis-h" className={this.styleSheet.verticalDots} />,

            ]
        } else {
            return [
                <div ref="rightButton" ><FAIcon icon="caret-right" className={this.styleSheet.arrowButton}/></div>,
                <div><FAIcon icon="bars" className={this.styleSheet.horizontalDots}/></div>,
                <div ref="leftButton" ><FAIcon icon="caret-left" className={this.styleSheet.arrowButton} /></div>,
            ];
        }
    }

    onMount() {
        super.onMount();
        this.addNodeListener("mousedown", () => {
            this.addClass(this.styleSheet.buttonsDisabled);
        });
        this.addNodeListener("mouseup", () => {
            this.removeClass(this.styleSheet.buttonsDisabled);
        });
        this.leftButton.addNodeListener("mousedown", (event) => {
            event.stopPropagation();
        });
        this.rightButton.addNodeListener("mousedown", (event) => {
            event.stopPropagation();
        });
        this.leftButton.addClickListener((event) => {
            this.dispatch("collapsePrevious");
        });
        this.rightButton.addClickListener((event) => {
            this.dispatch("collapseNext");
        })
    }
}


@registerStyle(TitledDividerStyle)
class BarCollapsePanel extends UI.Element {
    extraNodeAttributes(attr) {
        const panelChild = this.getGivenChildren()[0];
        attr.addClass(this.styleSheet.barCollapsePanel);
        if (panelChild.options.size) {
            if (this.options.orientation === Orientation.VERTICAL) {
                attr.setStyle("height", panelChild.options.size);
            } else {
                attr.setStyle("width", panelChild.options.size);
            }
        }

        if (this.options.orientation === Orientation.VERTICAL) {
            attr.setStyle("width", "100%");
        } else {
            attr.setStyle("height", "100%");
        }
    }

    render() {
        if (this.collapsed) {
            this.addClass(this.styleSheet.hiddenContent);
        }
        return [
            this.getGivenChildren(),
            <div ref="collapsedBarTitle" className={this.styleSheet.collapsedBarTitle}>
                <div><FAIcon icon="caret-right"/></div>
                <div className={this.styleSheet.title}>
                    <div>
                        {this.options.title}
                    </div>
                </div>
                <div><FAIcon icon="caret-left"/></div>
            </div>
        ]
    }

    toggle() {
        if (this.collapsed) {
            this.collapsed = false;
            this.removeClass(this.styleSheet.hiddenContent);
            this.collapsedBarTitle.setStyle("display", "none");
        } else {
            this.collapsed = true;
            this.collapsedBarTitle.setStyle("display", "flex");
            setTimeout(() => {
                this.addClass(this.styleSheet.hiddenContent);
            }, 100)

        }
    }

    onMount() {
         this.collapsedBarTitle.addClickListener(() => {
             this.dispatch("expand");
         });
    }
}


@registerStyle(TitledDividerStyle)
export class TitledSectionDivider extends SectionDivider {
    getDefaultOptions() {
        return Object.assign({}, super.getDefaultOptions(), {
            collapsedSize: 40,
        });
    }

    getDividerBarClass() {
        return TitledSectionDividerBar;
    }

    setDimension(element, size) {
        if (this.getOrientation() === Orientation.HORIZONTAL) {
            element.setWidth(size);
        } else {
            element.setHeight(size);
        }
    }

    collapseChild(index) {
        if (this.clearListeners) {
            this.clearListeners();
        }

        this.addClass(this.styleSheet.paddingRemoved);
        this.addClass(this.styleSheet.animatedSectionDivider);

        let parentSize = this.getDimension(this);
        let child = this.panels[index];

        let childSize = this.getDimension(child);
        this.uncollapsedSizes.set(child, childSize);

        let unCollapsedCount = -1;
        for (let panel of this.panels) {
            if (!panel.collapsed && !panel.options.fixed) {
                unCollapsedCount += 1;
            }
        }

        this.setDimension(child, this.options.collapsedSize);
        child.toggle();

        for (let panel of this.panels) {
            if (!panel.collapsed && !panel.options.fixed) {
                this.setDimension(panel, (this.getDimension(panel) + (childSize - this.options.collapsedSize)/ unCollapsedCount) * 100
                                  / parentSize + "%");
            }
        }

        setTimeout(() => {
            this.removeClass(this.styleSheet.animatedSectionDivider);
            this.recalculateDimensions();
        }, this.styleSheet.transitionTime * 1000);
    }

    expandChild(index) {
        this.removeClass(this.styleSheet.paddingRemoved);
        this.addClass(this.styleSheet.animatedSectionDivider);

        let parentSize = this.getDimension(this);
        let child = this.panels[index];

        let unCollapsedCount = 1;
        for (let panel of this.panels) {
            if (!panel.collapsed && !panel.options.fixed) {
                unCollapsedCount += 1;
            }
        }

        let childSize = this.uncollapsedSizes.get(child);
        child.toggle();


        for (let panel of this.panels) {
            if (this.getDimension(panel) && !panel.options.fixed) {
                this.setDimension(panel, (this.getDimension(panel) - (childSize - this.options.collapsedSize)/ (unCollapsedCount - 1)) * 100
                                  / parentSize + "%");
            }
        }

        this.setDimension(child, childSize * 100 / parentSize + "%");


        setTimeout(() => {
            this.removeClass(this.styleSheet.animatedSectionDivider);
            this.recalculateDimensions();
        }, this.styleSheet.transitionTime * 1000);
    }


    dividerMouseDownFunction(dividerEvent) {
        let previousEvent = dividerEvent.domEvent;
        const index = this.dividers.indexOf(dividerEvent.divider);

        const previousPanel = this.getPreviousUnfixedChild(index);
        const nextPanel = this.getNextUnfixedChild(index);

        if (previousPanel && nextPanel) {
            const parentSize = this.getDimension(this);
            let panelsSize = parentSize;

            for (let panel of this.panels) {
                if (panel.options.fixed) {
                    panelsSize -= this.getDimension(panel);
                }
            }

            const deltaFunction = (this.getOrientation() === Orientation.HORIZONTAL ?
                                 (event) => Device.getEventX(event) :  (event) => Device.getEventY(event));

            const mouseMoveListener = this.addListener("dividerMousemove", (event) => {
                const delta = deltaFunction(event) - deltaFunction(previousEvent);

                const nextSize = this.getDimension(nextPanel) - delta;
                const previousSize = this.getDimension(previousPanel) + delta;

                if ((delta > 0 && nextPanel.collapsed) || (delta < 0 && previousPanel.collapsed)) {
                    return;
                }

                if (delta < 0 && nextPanel.collapsed) {
                    this.expandChild(index + 1);
                    return;
                }

                if (delta > 0 && previousPanel.collapsed) {
                    this.expandChild(index);
                    return;
                }

                if (nextSize < this.getMinDimension(nextPanel)) {
                    this.collapseChild(index + 1);
                    return;
                }

                if (previousSize < this.getMinDimension(previousPanel)) {
                    this.collapseChild(index);
                    return;
                }

                this.setDimension(nextPanel, nextSize * 100 / parentSize + "%");
                this.setDimension(previousPanel, previousSize * 100 / parentSize + "%");

                previousEvent = event;

                nextPanel.dispatch("resize");
                previousPanel.dispatch("resize");
            });

            const mouseUpListener = this.addListener("dividerMouseup", () => {
                if (this.clearListeners) {
                    this.clearListeners();
                }
            });

            this.clearListeners = () => {
                mouseMoveListener.remove();
                mouseUpListener.remove();
                this.clearListeners = null;
            }
        }
    }

    getChildrenToRender() {
        const children = [];
        this.dividers = [];
        this.panels = [];
        const DividerBarClass = this.getDividerBarClass();

        for (const child of unwrapArray(this.render())) {
            if (this.panels.length) {
                let divider = <DividerBarClass orientation={this.getOrientation()} />;
                children.push(divider);
                this.dividers.push(divider);
            }
            const wrappedChild = <BarCollapsePanel orientation={this.options.orientation}
                                                   title={child.options.title || "..."}>{child}</BarCollapsePanel>
            children.push(wrappedChild);
            this.panels.push(wrappedChild);
        }
        return children;
    }

    onMount() {
        super.onMount();
        const parentSize = this.getDimension(this);
        for (let i = 0; i < this.panels.length; i += 1) {
            const panel = this.panels[i];
            const size = this.getDimension(panel) / parentSize;
            this.attachListener(panel, "expand", () => {
                this.uncollapsedSizes.set(panel, size * this.getDimension(this));
                this.expandChild(i);
            });
        }
        for (let i = 0; i < this.dividers.length; i += 1) {
            this.attachListener(this.dividers[i], "collapseNext", () => this.collapseChild(i + 1));
            this.attachListener(this.dividers[i], "collapsePrevious", () => this.collapseChild(i));
        }
    }
}