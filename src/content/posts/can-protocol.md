---
title: "CAN 协议入门：帧格式与仲裁"
published: 2026-02-25
draft: false
description: "快速理解 CAN 协议的核心概念、帧结构与仲裁机制"
category: "嵌入式"
tags: ["CAN", "汽车电子", "通信协议"]
---

# CAN 协议入门：帧格式与仲裁

这篇文章是 CAN（Controller Area Network）协议的快速入门。

## 1. CAN 是什么

CAN 是一种多主（multi-master）总线通信协议，常见于汽车、工业控制等场景，强调可靠性和实时性。

## 2. 物理层与总线结构

- 总线结构通常是双线（CAN_H / CAN_L）
- 逻辑电平通过差分信号体现，抗干扰能力强

## 3. 帧类型概览

- 数据帧（Data Frame）
- 远程帧（Remote Frame）
- 错误帧（Error Frame）
- 过载帧（Overload Frame）

## 4. 数据帧结构（经典 CAN）

典型数据帧字段顺序：

- SOF（帧起始）
- ID（11 位或 29 位标识符）
- RTR / IDE / r0
- DLC（数据长度 0-8 字节）
- DATA（数据区）
- CRC
- ACK
- EOF

## 5. 仲裁机制

CAN 采用位级仲裁：

- 逻辑 0 为显性，逻辑 1 为隐性
- 发送 ID 越小优先级越高
- 多节点同时发送时，不会造成冲突，优先级低的自动退出

## 6. 常见问题

- 为什么 ID 越小优先级越高？
- 标准帧 vs 扩展帧的使用场景
- 数据长度超过 8 字节时怎么处理（CAN FD）

## 7. 下一步

建议你结合示波器或 USB-CAN 工具抓包，直观看帧结构与仲裁过程。
