import { Style } from "./Shapes/shape";
import { LineStyle } from "./Shapes/polyLine";
import { TextStyle } from "./Shapes/text";
import { anchor } from "./Model/linkHandler";


// 图形配置项
export interface BaseShapeOption {
    // 文本内容（字段名）
    content?: string | string[];
    // 图形尺寸
    size?: number | [number, number];
    // 锚点
    anchors?: { [key: number]: anchor };
    // 元素显示/隐藏动画
    show?: string | [string, string];
    // 图形样式
    style?: Style | LineStyle;
}



// 指针配置项
export interface PointerOption {
    length: number;
    offset: number;
    labelInterval: number;
    position?: 'top' | 'left' | 'bottom' | 'right';
    markers?: string | string[];
    labelStyle?: TextStyle;
    style?: LineStyle;
    show?: string | [string, string];
}

// 连接配置项
export interface LinkOption {
    markers?: string | string[];
    curveness?: number;
    contact?: [number, number][] | [number, number];   
    label?: string;
    labelStyle?: TextStyle;                  
    style?: LineStyle;
    show?: string | [string, string];
}


// 所有视图元素配置项
export type ElementsOption = { 
    [p: string]: string
} | string;

// 布局配置项
export interface LayoutOption {
    // 单个元素的图形配置
    [key: string]: BaseShapeOption | any;
    // 指针图形配置
    pointer?: { [k: string]: PointerOption };
    // 连接线图形配置
    link?: { [k: string]: LinkOption };
    // 是否自动将可视图形移到画布中央
    autoAdjust?: boolean;
}

// 动画配置项
export interface AnimationOption {
    // 是否允许跳过动画
    enableSkip?: boolean;
    // 是否开启动画
    enableAnimation?: boolean;
    // 缓动函数
    timingFunction?: string;
    // 动画时长
    duration?: number;
}


// 总配置项
export interface EngineOption {
    // 元素配置项
    element?: ElementsOption;
    // 布局配置项
    layout?: LayoutOption;
    // 动画配置项
    animation?: AnimationOption;
};