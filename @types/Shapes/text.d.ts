import { Shape, Style, BaseOption } from "./shape";
import { zrenderShape } from "../View/renderer";
import { BaseShapeOption } from "../option";
export declare class Text extends Shape {
    constructor(id: string, name: string, opt: BaseShapeOption);
    defaultOption(baseOption: BaseOption): {
        zIndex: number;
        content: string | string[];
        size: number | [number, number];
        show: string | [string, string];
    };
    defaultStyle(baseStyle: Style): Style;
    /**
     * 更新文本样式
     * - 因为文本图形比较特殊，一开始便创建了zrender实例，所以需要在后期单独更新样式
     */
    updateText(zrenderShape: any): void;
    createZrenderShape(): zrenderShape;
}
