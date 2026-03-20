/**
 * 多数据库支持 API
 * v1.2.0
 */

import express, { Request, Response } from 'express'
import { connectionManager } from '../managers/connection'
import { DatabaseConfig, DatabaseType } from '../drivers/database'

const router = express.Router()

/**
 * 获取支持的数据库类型
 */
router.get('/types', (req: Request, res: Response) => {
  const types = connectionManager.getSupportedTypes()
  const typeInfos = types.map(type => ({
    type,
    ...connectionManager.getTypeInfo(type),
  }))
  res.json({ types: typeInfos })
})

/**
 * 获取连接列表
 */
router.get('/connections', (req: Request, res: Response) => {
  const connections = connectionManager.getConnections()
  res.json({ connections })
})

/**
 * 创建连接
 */
router.post('/connections', async (req: Request, res: Response) => {
  try {
    const { name, config } = req.body as { name: string; config: DatabaseConfig }
    
    if (!name || !config) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const connection = await connectionManager.createConnection(name, config)
    res.json({ success: true, connection })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * 连接数据库
 */
router.post('/connections/:id/connect', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await connectionManager.connect(id)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * 断开连接
 */
router.post('/connections/:id/disconnect', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await connectionManager.disconnect(id)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * 删除连接
 */
router.delete('/connections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await connectionManager.deleteConnection(id)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * 测试连接
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const config = req.body as DatabaseConfig
    const result = await connectionManager.testConnection(config)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取表列表
 */
router.get('/connections/:id/tables', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { schema } = req.query
    const driver = connectionManager.getDriver(id)
    
    if (!driver) {
      return res.status(400).json({ error: '未连接' })
    }

    const tables = await driver.getTables(schema as string)
    res.json({ tables })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取列信息
 */
router.get('/connections/:id/tables/:table/columns', async (req: Request, res: Response) => {
  try {
    const { id, table } = req.params
    const { schema } = req.query
    const driver = connectionManager.getDriver(id)
    
    if (!driver) {
      return res.status(400).json({ error: '未连接' })
    }

    const columns = await driver.getColumns(table, schema as string)
    res.json({ columns })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取主键
 */
router.get('/connections/:id/tables/:table/keys', async (req: Request, res: Response) => {
  try {
    const { id, table } = req.params
    const { schema } = req.query
    const driver = connectionManager.getDriver(id)
    
    if (!driver) {
      return res.status(400).json({ error: '未连接' })
    }

    const keys = await driver.getPrimaryKeys(table, schema as string)
    res.json({ keys })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
