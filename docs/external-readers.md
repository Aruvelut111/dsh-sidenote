# 外部阅读批注接口（本地 v1）

阅读器内部的文字层、分页和绘制更新不触发聊天批注层重算。关闭侧栏、切换会话和来源替换仍更新可见状态。

插件在 document 上派发同步 CustomEvent `dsh-sidenote:external-annotation:v1`，detail 为 `{action,capture?,sessionId?,id?,point?,reply}`；reply 接收 `{accepted,id?,items?}`。这是同页面插件能力，不跨窗口、不开放网络。

- `probe`：询问接口是否就绪。
- `add`：capture 为 `{id?,sessionId,text,note?,source:{label,address?,page?,anchor?:{exact,start,prefix,suffix}},point?:{x,y},edit?}`。sessionId 为明确发送目标；source 独立标识阅读来源。默认打开原生编辑器；`edit:false` 适用于网页内已有编辑器。id 在同目标会话中幂等，持久化后重试也可去重。
- `list`：仅返回 sessionId 对应的外部批注（active 和 sent）。
- `edit`：用 sessionId 和 store 数字 id 重新打开批注；已发送项走只读查看。

store 变更会派发 `dsh-sidenote:external-annotations-changed`。来源按钮派发 `dsh-sidenote:reveal-external:v1`，detail 为 `{sessionId,source,text}`，由阅读插件处理导航；sidenote 不直接打开任意地址。

捕获 id 在一次选区的整个生命周期不变；发送或删除后的旧输入重试只确认、不重新创建 active，新选区使用新 id。可选 `remove` 接收 `{sessionId,id?,captureId?}`，重复删除与首次添加确认前删除均幂等。拒绝跨会话修改，发送期间拒绝更新或删除已有项。阅读器只显示待发送蓝色标记，成功发送后移除原文投影，历史消息保留快照。地址只作为来源和引用内容，页面端调用方仍须按自身协议验证导航。持久层保持 v1 兼容，新增 externalSource/externalCaptureId 为可选字段。未修订上游版不接受本事件，阅读器应回退。

外部原位编辑和清单编辑逐次保存输入，刷新/卸载后可恢复。明确取消时恢复重开编辑前的文本，新建取消删除该条。切换会话收起旧编辑器；提交期间拒绝重开，已发送快照不可原地改写。批注仍属于同地址、同浏览器的 localStorage；清站点数据或配额失败不保证恢复。

可选文本上下文随持久化和回源事件保留，由阅读器校验位置；旧捕获保持兼容。
