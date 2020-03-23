"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../Common/util");
const boundingRect_1 = require("../View/boundingRect");
const vector_1 = require("../Common/vector");
/**
 * 连接处理器
 */
class LinkModel {
    constructor(engine, dataModel, viewModel) {
        this.engine = engine;
        this.linkPairs = [];
        this.labelList = [];
        this.labelAvoidLevel = 2;
        this.dataModel = dataModel;
        this.viewModel = viewModel;
    }
    /**
     * 构建连接模型
     * @param elements
     * @param elementList
     * @param linkOptions
     */
    constructLinks(elements, elementList, linkOptions) {
        this.buildLinkRelation(elements, elementList);
        Object.keys(linkOptions).map(linkName => {
            let linkOption = linkOptions[linkName];
            // 遍历所有元素，创建连接对信息到linkPairs队列
            for (let i = 0; i < elementList.length; i++) {
                let ele = elementList[i];
                // 若没有连接字段的结点则跳过
                if (!ele[linkName])
                    continue;
                if (Array.isArray(ele[linkName])) {
                    ele[linkName].map((item, index) => {
                        if (!item)
                            return;
                        this.generateLinkPair(ele, item, linkOption, linkName, index);
                    });
                }
                else {
                    this.generateLinkPair(ele, ele[linkName], linkOption, linkName);
                }
            }
        });
    }
    /**
     * 根据配置项，更新连接图形
     * @param linkOptions
     * @param elementList
     */
    updateLinkShape() {
        // 遍历连接对队列，进行元素间的连接绑定
        for (let i = 0; i < this.linkPairs.length; i++) {
            this.linkElement(this.linkPairs[i]);
        }
    }
    /**
     * 根据源数据连接信息，将sourceElement替换为Element
     * @param elements
     * @param elementList
     */
    buildLinkRelation(elements, elementList) {
        Object.keys(this.engine.layoutOption.link).map(linkName => {
            for (let i = 0; i < elementList.length; i++) {
                let ele = elementList[i], linkData = ele[linkName], targetElement = null;
                if (linkData === undefined || linkData === null)
                    continue;
                //  ---------------------------- 将连接声明字段从id变为Element ---------------------
                // 若连接声明是一个对象
                if (typeof linkData === 'object' && !Array.isArray(linkData)) {
                    // 目标结点类型
                    let eleType = linkData.element;
                    if (Array.isArray(linkData.target)) {
                        ele[linkName] = linkData.target.map(item => {
                            if (item) {
                                targetElement = elements[eleType].find(e => e.id === item);
                                return targetElement ? targetElement : null;
                            }
                            else {
                                return null;
                            }
                        });
                    }
                    else {
                        targetElement = elements[eleType].find(e => e.id === linkData.target);
                        ele[linkName] = targetElement ? targetElement : null;
                    }
                }
                // 是一个数组
                else if (Array.isArray(linkData)) {
                    ele[linkName] = linkData.map(item => {
                        if (item) {
                            targetElement = elements[ele.name].find(e => e.id === item);
                            return targetElement ? targetElement : null;
                        }
                        else {
                            return null;
                        }
                    });
                }
                // 是一个id
                else {
                    targetElement = elements[ele.name].find(e => e.id === ele[linkName]);
                    ele[linkName] = targetElement ? targetElement : null;
                }
            }
        });
    }
    /**
     * 生成连接对
     * @param element
     * @param target
     * @param linkOption
     * @param linkName
     * @param index
     */
    generateLinkPair(element, target, linkOption, linkName, index) {
        let contact = this.contactSolver(linkOption.contact, index), linkShape = this.viewModel.createShape(`${element.elementId}-${target.elementId}`, 'line', linkOption);
        this.linkPairs.push({
            linkName,
            linkShape,
            ele: element,
            target,
            anchorPair: contact ? [
                this.getElementAnchor(element, contact[0]), this.getElementAnchor(target, contact[1])
            ] : contact,
            anchorPosPair: null,
            label: this.labelSolver(linkOption.label, element, target, index),
            index,
            dynamic: contact ? false : true
        });
        element.onLink(target, linkShape.style, linkName);
        target.onLink(null, linkShape.style, linkName);
    }
    /**
     * 连接两结点
     * @param linkPair
     */
    linkElement(linkPair) {
        let linkOption = this.engine.layoutOption.link[linkPair.linkName], element = linkPair.ele, target = linkPair.target, label = linkPair.label, linkShape = linkPair.linkShape, labelShape = null, start, end;
        // 若锚点越界（如只有3个锚点，contact却有大于3的值），退出
        if (linkPair.anchorPair && (linkPair.anchorPair[0] === undefined || linkPair.anchorPair[1] === undefined)) {
            return;
        }
        if (label) {
            labelShape = this.viewModel.createShape(`${element.elementId}-${target.elementId}-label`, 'text', {
                show: linkOption.show,
                content: label,
                style: linkOption.labelStyle
            });
            this.labelList.push(labelShape);
        }
        // 若使用动态锚点，获取动态锚点
        if (linkPair.dynamic) {
            [start, end] = this.getDynamicAnchorPos(element, target);
        }
        // 若已配置有连接点，使用连接点
        else {
            start = this.getAnchorPos(element, linkPair.anchorPair[0]),
                end = this.getAnchorPos(target, linkPair.anchorPair[1]);
        }
        // 若发现该连接有冲突，则进行处理，重新计算start，end坐标
        [start, end] = this.anchorAvoid([start, end]);
        linkPair.anchorPosPair = [start, end];
        linkShape.start.x = start[0];
        linkShape.start.y = start[1];
        linkShape.end.x = end[0];
        linkShape.end.y = end[1];
        // 若有标签，标签避让检测
        if (labelShape) {
            this.labelAvoid(labelShape, linkShape, [0, 1], 0);
        }
    }
    /**
     * 处理连接点
     * @param contacts
     * @param index
     */
    contactSolver(contacts, index) {
        if (contacts) {
            if (Array.isArray(contacts[0])) {
                return index === undefined ? contacts[0] : contacts[index];
            }
            else if (typeof contacts === 'function' && index !== undefined) {
                return contacts(index);
            }
            else {
                return contacts;
            }
        }
        // 若没有配置连接点，返回null（退回至动态锚点）
        else {
            return null;
        }
    }
    /**
     * 处理锚点冲突
     *（即开始锚点和结束锚点都被占用）
     * @param start
     * @param end
     */
    anchorAvoid(anchorPosPair) {
        // 查看是否碰撞
        let collisionPair = this.linkPairs.find(item => {
            if (item.anchorPosPair) {
                return item.anchorPosPair[0].toString() === anchorPosPair[1].toString() &&
                    item.anchorPosPair[1].toString() === anchorPosPair[0].toString();
            }
            else {
                return false;
            }
        });
        if (collisionPair) {
            let tangent1 = vector_1.Vector.tangent(vector_1.Vector.subtract(anchorPosPair[1], anchorPosPair[0])), tangent2 = vector_1.Vector.tangent(vector_1.Vector.subtract(collisionPair.anchorPosPair[1], collisionPair.anchorPosPair[0])), offset = -6;
            let newAnchorPosPair1 = [vector_1.Vector.location(anchorPosPair[0], tangent1, offset), vector_1.Vector.location(anchorPosPair[1], tangent1, offset)], newAnchorPosPair2 = [vector_1.Vector.location(collisionPair.anchorPosPair[0], tangent2, offset), vector_1.Vector.location(collisionPair.anchorPosPair[1], tangent2, offset)];
            collisionPair.linkShape.start.x = newAnchorPosPair2[0][0];
            collisionPair.linkShape.start.y = newAnchorPosPair2[0][1];
            collisionPair.linkShape.end.x = newAnchorPosPair2[1][0];
            collisionPair.linkShape.end.y = newAnchorPosPair2[1][1];
            collisionPair.anchorPosPair = newAnchorPosPair2;
            return newAnchorPosPair1;
        }
        else {
            return anchorPosPair;
        }
    }
    /**
     * 处理标签
     * @param sourceText
     * @param ele
     * @param targetEle
     * @param index
     */
    labelSolver(sourceText, ele, targetEle, index) {
        if (!sourceText)
            return null;
        let resultText = sourceText, props = util_1.Util.textParser(sourceText);
        if (Array.isArray(props)) {
            let values = props.map(item => {
                let value = /target/g.test(item) ?
                    targetEle[item.replace(/target\./g, '')] :
                    ele[item];
                if (value === undefined)
                    return null;
                if (Array.isArray(value) && index >= 0) {
                    return value[index];
                }
                else {
                    return value;
                }
            });
            for (let i = 0; i < values.length; i++) {
                if (values[i] === null)
                    return null;
                resultText = resultText.replace('[' + props[i] + ']', values[i]);
            }
            return resultText;
        }
        else {
            return props;
        }
    }
    /**
     * 标签避让算法
     * @param label
     * @param line
     * @param percentRange
     * @param level
     */
    labelAvoid(label, line, percentRange, level) {
        let collisionFlag = false, middlePercent, center, j;
        middlePercent = (percentRange[1] + percentRange[0]) / 2;
        center = line.pointAt(middlePercent);
        // 设置标签位置为线段中点
        label.x = center[0] - label.width / 2;
        label.y = center[1] - label.height / 2;
        for (j = 0; j < this.labelList.length; j++) {
            if (label !== this.labelList[j] && boundingRect_1.Bound.isOverlap(label.getBound(), this.labelList[j].getBound())) {
                collisionFlag = true;
                break;
            }
        }
        // 若发生重叠且递归层级比规定的层级上限小，则继续二分检测
        if (collisionFlag && level <= this.labelAvoidLevel) {
            let range1 = [percentRange[0], middlePercent], range2 = [middlePercent, percentRange[1]];
            let flag = this.labelAvoid(label, line, range1, level + 1);
            if (!flag) {
                flag = this.labelAvoid(label, line, range2, level + 1);
            }
            return flag;
        }
        // 如果没有重叠，则就用这个位置
        else {
            return true;
        }
    }
    /**
     * 获取元素的某个锚点
     */
    getElementAnchor(ele, anchorIndex) {
        let customAnchors = this.engine.layoutOption[ele.name].anchors, defaultAnchors = ele.shape.defaultAnchors(ele.shape.getBaseAnchors(), ele.shape.width, ele.shape.height);
        if (customAnchors) {
            Object.keys(customAnchors).map(key => {
                defaultAnchors[key] = customAnchors[key];
            });
        }
        return defaultAnchors[anchorIndex];
    }
    /**
     * 当用户没有指定连接点时，使用动态锚点
     * 原理：使用外接圆，取两个元素外接圆中心连线与各自外接圆的交点，但是该方法精度不高
     * @param ele
     * @param target
     */
    getDynamicAnchorPos(ele, target) {
        let cir1Pos = [ele.x, ele.y], cir1r = (ele.getWidth() > ele.getHeight() ? ele.getWidth() : ele.getHeight()) / 2, cir2Pos = [target.x, target.y], cir2r = (target.getWidth() > target.getHeight() ? target.getWidth() : target.getHeight()) / 2;
        let direction = vector_1.Vector.subtract(cir1Pos, cir2Pos), anchor1 = vector_1.Vector.location(cir1Pos, vector_1.Vector.negative(direction), cir1r), anchor2 = vector_1.Vector.location(cir2Pos, direction, cir2r);
        return [anchor1, anchor2];
    }
    /**
     * 将某个结点的所有锚点转化为世界坐标
     * @param ele
     * @param anchors
     */
    getAnchorPos(ele, anchor) {
        let x = ele.x, y = ele.y, hw = ele.shape.width / 2, hh = ele.shape.height / 2;
        return util_1.Util.anchor2position(x, y, hw * 2, hh * 2, ele.rotation, anchor);
    }
    clear() {
        this.linkPairs.length = 0;
        this.labelList.length = 0;
    }
}
exports.LinkModel = LinkModel;