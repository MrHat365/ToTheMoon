#!/bin/bash

# 切换到脚本所在目录（确保路径正确）
SHELL_FOLDER=$(cd "$(dirname "$0")"; pwd)
cd "$SHELL_FOLDER"

# 提示用户输入提交信息
read -p "请输入提交信息: " commit_msg

# 空值检查
if [ -z "$commit_msg" ]; then
    echo "错误：提交信息不能为空！"
    exit 1
fi

# 执行 Git 操作
git add . && \
git commit -m "$commit_msg" && \
git push -u origin main

# 检查命令是否成功
if [ $? -eq 0 ]; then
    echo "提交成功！"
else
    echo "提交失败，请检查错误。"
fi
