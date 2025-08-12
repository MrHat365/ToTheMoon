import { NextRequest, NextResponse } from 'next/server';
import { schedulerService } from '@/lib/services/scheduler.service';

// 定时任务请求参数接口
interface TimedTaskRequest {
  action: 'start' | 'stop' | 'status' | 'cleanup' | 'force-clean' | 'debug';
  taskType: 'active' | 'passive';  // 主动控制或被动控制
  templateId: string;
  config?: {
    minTimeSeconds: number;
    maxTimeSeconds: number;
    // 其他任务配置参数
    minSize: number;
    maxSize: number;
    buySell: 'buy' | 'sell';
    orderType: string;
    symbol: string;
    accounts: string[];
    orderBookLevel?: string;
    eatLimit?: number;
    maxTradeAmount?: number;
    amountType?: 'USDT' | 'TOKEN';
  };
}

// POST - 启动/停止定时任务
export async function POST(request: NextRequest) {
  try {
    const body: TimedTaskRequest = await request.json();
    const { action, taskType, templateId, config } = body;

    // 生成唯一的任务ID
    const taskId = `${taskType}_${templateId}`;

    switch (action) {
      case 'start':
        if (!config) {
          return NextResponse.json({
            success: false,
            error: '启动任务需要提供配置参数'
          }, { status: 400 });
        }

        // 验证配置参数
        if (config.minTimeSeconds <= 0 || config.maxTimeSeconds <= 0) {
          return NextResponse.json({
            success: false,
            error: '时间间隔必须大于0秒'
          }, { status: 400 });
        }

        if (config.minTimeSeconds >= config.maxTimeSeconds) {
          return NextResponse.json({
            success: false,
            error: '最小时间间隔必须小于最大时间间隔'
          }, { status: 400 });
        }

        // 检查是否已有任务运行
        if (schedulerService.isTaskRunning(taskId)) {
          return NextResponse.json({
            success: false,
            error: '该任务已在运行中'
          }, { status: 400 });
        }

        // 创建任务函数
        const taskFunction = () => {
          const now = new Date();
          console.log(`[${taskType.toUpperCase()}定时任务] 执行时间: ${now.toLocaleString('zh-CN')}`);
          console.log(`[${taskType.toUpperCase()}定时任务] 模板ID: ${templateId}`);
          console.log(`[${taskType.toUpperCase()}定时任务] 配置参数:`, {
            symbol: config.symbol,
            size: `${config.minSize}-${config.maxSize}`,
            buySell: config.buySell,
            orderType: config.orderType,
            accounts: config.accounts,
            orderBookLevel: config.orderBookLevel,
            eatLimit: config.eatLimit,
            maxTradeAmount: config.maxTradeAmount,
            amountType: config.amountType
          });
          
          // 这里可以添加实际的交易逻辑
          // 目前只是测试功能，打印当前时间
        };

        // 启动任务
        const success = schedulerService.startTask({
          taskId,
          minTimeSeconds: config.minTimeSeconds,
          maxTimeSeconds: config.maxTimeSeconds,
          taskFunction
        });

        if (success) {
          return NextResponse.json({
            success: true,
            message: `${taskType === 'active' ? '主动' : '被动'}控制定时任务已启动`,
            taskId,
            config
          });
        } else {
          return NextResponse.json({
            success: false,
            error: '启动定时任务失败'
          }, { status: 500 });
        }

      case 'stop':
        console.log(`[API] 正在尝试停止任务: ${taskId}, taskType: ${taskType}, templateId: ${templateId}`);
        const stopSuccess = schedulerService.stopTask(taskId);
        
        if (stopSuccess) {
          return NextResponse.json({
            success: true,
            message: `${taskType === 'active' ? '主动' : '被动'}控制定时任务已停止`,
            taskId
          });
        } else {
          return NextResponse.json({
            success: false,
            error: '停止定时任务失败或任务不存在'
          }, { status: 400 });
        }

      case 'status':
        const status = schedulerService.getTaskStatus(taskId);
        
        return NextResponse.json({
          success: true,
          data: {
            taskId,
            status,
            isRunning: status ? status.isRunning : false
          }
        });

      case 'cleanup':
        // 清理异常任务
        schedulerService.cleanupStaleError();
        
        return NextResponse.json({
          success: true,
          message: '异常任务清理完成'
        });

      case 'force-clean':
        // 强制清理所有任务
        schedulerService.forceCleanAllTasks();
        
        return NextResponse.json({
          success: true,
          message: '所有任务已强制清理'
        });

      case 'debug':
        // 调试：返回所有任务信息
        const allTasks = schedulerService.getAllTasks();
        const taskList = Array.from(allTasks.entries()).map(([id, task]) => ({
          id,
          status: task.status,
          hasTimeoutId: !!task.timeoutId,
          hasJob: !!task.job
        }));
        
        return NextResponse.json({
          success: true,
          data: {
            taskCount: allTasks.size,
            tasks: taskList
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作类型'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('定时任务API错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}

// GET - 获取所有任务状态
export async function GET() {
  try {
    const allTasks = schedulerService.getAllTasksStatus();
    const debugInfo = schedulerService.getDebugInfo();

    return NextResponse.json({
      success: true,
      data: {
        tasks: allTasks,
        debugInfo
      }
    });
  } catch (error) {
    console.error('获取任务状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取任务状态失败'
    }, { status: 500 });
  }
}