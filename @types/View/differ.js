"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const polyLine_1 = require("../Shapes/polyLine");
var patchType;
(function (patchType) {
    patchType[patchType["ADD"] = 0] = "ADD";
    patchType[patchType["REMOVE"] = 1] = "REMOVE";
    patchType[patchType["POSITION"] = 2] = "POSITION";
    patchType[patchType["ROTATION"] = 3] = "ROTATION";
    patchType[patchType["STYLE"] = 4] = "STYLE";
})(patchType = exports.patchType || (exports.patchType = {}));
class Differ {
    /**
     * 进行图形样式对象的比较
     * @param oldStyle
     * @param newStyle
     */
    differStyle(oldStyle, newStyle) {
        let styleName = [];
        Object.keys(newStyle).map(prop => {
            if (newStyle[prop] !== oldStyle[prop]) {
                styleName.push({
                    name: prop,
                    old: oldStyle[prop],
                    new: newStyle[prop]
                });
            }
        });
        return styleName;
    }
    /**
     * 图形间的differ
     * @param oldShape
     * @param newShape
     */
    differShape(oldShape, newShape) {
        let patchList = [];
        // 比较图形坐标位置
        if (oldShape instanceof polyLine_1.PolyLine && newShape instanceof polyLine_1.PolyLine) {
            if (JSON.stringify(oldShape.prevPath) !== JSON.stringify(newShape.path)) {
                patchList.push({
                    type: patchType.POSITION,
                    newShape,
                    oldShape
                });
            }
        }
        else {
            if (oldShape.prevX !== newShape.x || oldShape.prevY !== newShape.y) {
                patchList.push({
                    type: patchType.POSITION,
                    newShape,
                    oldShape
                });
            }
        }
        // 比较旋转角度
        if (oldShape.prevRotation !== newShape.rotation) {
            patchList.push({
                type: patchType.ROTATION,
                newShape,
                oldShape
            });
        }
        // 比较样式
        let style = this.differStyle(oldShape.prevStyle, newShape.style);
        if (style.length) {
            patchList.push({
                type: patchType.STYLE,
                newShape,
                oldShape,
                data: style
            });
        }
        return patchList;
    }
    /**
     * 进行视图模型中图形列表的differ
     * @param oldShapeList
     * @param newShapeList
     * @param shapeListName
     */
    differShapeList(oldShapeList, newShapeList, shapeListName) {
        let patchList = [], newShape, oldShape, i;
        for (i = 0; i < newShapeList.length; i++) {
            newShape = newShapeList[i];
            oldShape = oldShapeList.find(shape => newShape.id === shape.id);
            // 若旧图形列表存在对应的图形
            if (oldShape) {
                oldShape.visited = true;
                patchList.push(...this.differShape(oldShape, newShape));
            }
            // 否则标记为新增
            else {
                patchList.push({
                    type: patchType.ADD,
                    newShape,
                    oldShape: null,
                    data: shapeListName
                });
            }
        }
        // 移除未访问过的图形
        oldShapeList.filter(shape => !shape.visited).map(shape => patchList.push({
            type: patchType.REMOVE,
            newShape: null,
            oldShape: shape,
            data: shapeListName
        }));
        return patchList;
    }
    /**
     * 进行视图模型differ
     * @param oldView
     * @param newView
     */
    differShapeContainer(oldShapeContainer, newShapeContainer) {
        let patchList = [];
        // 若发现存在于新视图模型而不存在于旧视图模型的图形列表，则该列表所有图形都标记为ADD
        Object.keys(newShapeContainer).map(shapeList => {
            if (oldShapeContainer[shapeList] === undefined) {
                newShapeContainer[shapeList].map(item => {
                    patchList.push({
                        type: patchType.ADD,
                        newShape: item,
                        oldShape: null,
                        data: shapeList
                    });
                });
            }
        });
        // 若发现存在于旧视图模型而不存在于新视图模型的图形列表，则该列表所有图形都标记为REMOVE
        Object.keys(oldShapeContainer).map(shapeList => {
            if (newShapeContainer[shapeList] === undefined) {
                oldShapeContainer[shapeList].map(item => {
                    patchList.push({
                        type: patchType.REMOVE,
                        newShape: null,
                        oldShape: item,
                        data: shapeList
                    });
                });
            }
        });
        // 对于新旧视图模型都存在的图形列表，进行列表differ
        Object.keys(newShapeContainer).map(shapeList => {
            if (oldShapeContainer[shapeList]) {
                patchList.push(...this.differShapeList(oldShapeContainer[shapeList], newShapeContainer[shapeList], shapeList));
            }
        });
        return patchList;
    }
    /**
     * 对修改的视图进行补丁更新
     * @param viewModel
     * @param patchList
     */
    patch(viewModel, patchList) {
        let patch, newShape, oldShape, i;
        for (i = 0; i < patchList.length; i++) {
            patch = patchList[i];
            newShape = patch.newShape;
            oldShape = patch.oldShape;
            switch (patch.type) {
                case patchType.ADD: {
                    viewModel.addShape(newShape, patch.data);
                    break;
                }
                case patchType.REMOVE: {
                    viewModel.removeShape(oldShape);
                    break;
                }
                case patchType.POSITION: {
                    if (newShape instanceof polyLine_1.PolyLine && oldShape instanceof polyLine_1.PolyLine) {
                        oldShape.path = newShape.path;
                        oldShape.updateZrenderShape('path', true);
                    }
                    else {
                        oldShape.x = newShape.x;
                        oldShape.y = newShape.y;
                        oldShape.updateZrenderShape('position', true);
                    }
                    break;
                }
                case patchType.ROTATION: {
                    oldShape.rotation = newShape.rotation;
                    oldShape.updateZrenderShape('rotation', true);
                    break;
                }
                case patchType.STYLE: {
                    oldShape.style = newShape.style;
                    oldShape.updateZrenderShape('style', true);
                    break;
                }
                default: {
                    break;
                }
            }
            if (oldShape && oldShape.element) {
                // 触发元素更新事件
                oldShape.element.onChange(patch.type);
            }
        }
    }
}
exports.Differ = Differ;
