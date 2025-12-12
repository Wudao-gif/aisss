/**
 * 阿里云短信服务工具库
 * 使用 SMS API 发送短信验证码
 */

import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525'
import * as $OpenApi from '@alicloud/openapi-client'

// 短信配置
const SMS_CONFIG = {
  // 短信签名（需要在阿里云控制台申请）
  signName: process.env.ALIYUN_SMS_SIGN_NAME || 'Brillance',
  // 验证码模板 ID（需要在阿里云控制台申请）
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
  // API 区域
  region: process.env.ALIYUN_SMS_REGION || 'cn-hangzhou',
}

/**
 * 创建短信服务客户端
 */
function createSmsClient(): Dysmsapi20170525 {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    endpoint: 'dysmsapi.aliyuncs.com',
  })

  return new Dysmsapi20170525(config)
}

/**
 * 发送短信验证码
 */
export async function sendSmsVerificationCode(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string; bizId?: string }> {
  try {
    // 开发环境显示完整信息，生产环境脱敏
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 [SMS] 准备发送验证码:', { phone, code })
    } else {
      console.log('📱 [SMS] 准备发送验证码:', { phone: phone.slice(0, 3) + '****' + phone.slice(-4), code: '******' })
    }

    // 检查配置
    if (!SMS_CONFIG.templateCode) {
      console.error('❌ [SMS] 短信模板未配置')
      return {
        success: false,
        message: '短信服务未配置，请联系管理员',
      }
    }

    const client = createSmsClient()

    const request = new $Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName: SMS_CONFIG.signName,
      templateCode: SMS_CONFIG.templateCode,
      templateParam: JSON.stringify({ code }),
    })

    const response = await client.sendSms(request)

    if (response.body?.code === 'OK') {
      console.log('✅ [SMS] 短信发送成功:', {
        bizId: response.body?.bizId,
        requestId: response.body?.requestId,
      })

      return {
        success: true,
        message: '验证码已发送',
        bizId: response.body?.bizId,
      }
    } else {
      console.error('❌ [SMS] 短信发送失败:', response.body)
      return {
        success: false,
        message: response.body?.message || '短信发送失败',
      }
    }
  } catch (error: any) {
    console.error('❌ [SMS] 短信发送异常:', error)
    console.error('错误详情:', error.message)

    let message = '验证码发送失败，请稍后重试'
    if (error.code === 'isv.MOBILE_NUMBER_ILLEGAL') {
      message = '手机号格式不正确'
    } else if (error.code === 'isv.BUSINESS_LIMIT_CONTROL') {
      message = '发送过于频繁，请稍后重试'
    } else if (error.code === 'isv.SMS_SIGNATURE_ILLEGAL') {
      message = '短信签名未审核通过'
    } else if (error.code === 'isv.SMS_TEMPLATE_ILLEGAL') {
      message = '短信模板未审核通过'
    }

    return {
      success: false,
      message,
    }
  }
}

/**
 * 生成 6 位随机验证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

