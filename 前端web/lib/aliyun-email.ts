/**
 * 阿里云邮件推送工具库
 * 使用 DirectMail API 发送邮件
 */

import Dm20151123, * as $Dm20151123 from '@alicloud/dm20151123'
import * as $OpenApi from '@alicloud/openapi-client'

// 邮件推送配置
const EMAIL_CONFIG = {
  // 发信地址（需要在阿里云控制台配置）
  accountName: process.env.ALIYUN_EMAIL_ACCOUNT || 'noreply@btoagent.com',
  // 发信人昵称
  fromAlias: process.env.ALIYUN_EMAIL_ALIAS || 'Brillance',
  // API 区域（华东1）
  region: process.env.ALIYUN_EMAIL_REGION || 'cn-hangzhou',
}

/**
 * 创建邮件推送客户端
 */
function createEmailClient(): Dm20151123 {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    // 阿里云邮件推送 API 端点（注意：不是区域端点）
    endpoint: 'dm.aliyuncs.com',
  })

  return new Dm20151123(config)
}

/**
 * 生成验证码邮件 HTML 内容
 */
function generateVerificationEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验证码</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px;">
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h1 style="margin: 0 0 10px; font-size: 24px; color: #37322F; font-weight: 600;">Brillance</h1>
              <p style="margin: 0; font-size: 14px; color: #666;">您的学习助手</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">您好！</p>
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">您正在进行邮箱验证，验证码为：</p>
              <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #37322F; letter-spacing: 8px;">${code}</span>
              </div>
              <p style="margin: 20px 0 0; font-size: 14px; color: #666; line-height: 1.6;">验证码有效期为 <strong>5 分钟</strong>，请尽快完成验证。</p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #999; line-height: 1.6;">如果这不是您本人的操作，请忽略此邮件。</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">此邮件由系统自动发送，请勿回复</p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} Brillance. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationEmail(
  toEmail: string,
  code: string
): Promise<{ success: boolean; message: string; envId?: string }> {
  try {
    console.log('📧 [Email] 准备发送验证码邮件:', { toEmail, code: code.substring(0, 2) + '****' })

    const client = createEmailClient()

    const request = new $Dm20151123.SingleSendMailRequest({
      accountName: EMAIL_CONFIG.accountName,
      addressType: 1, // 1: 发信地址
      replyToAddress: false,
      toAddress: toEmail,
      subject: `【Brillance】您的验证码是 ${code}`,
      htmlBody: generateVerificationEmailHtml(code),
      fromAlias: EMAIL_CONFIG.fromAlias,
    })

    const response = await client.singleSendMail(request)

    console.log('✅ [Email] 邮件发送成功:', {
      envId: response.body?.envId,
      requestId: response.body?.requestId,
    })

    return {
      success: true,
      message: '验证码已发送',
      envId: response.body?.envId,
    }
  } catch (error: any) {
    console.error('❌ [Email] 邮件发送失败:', error)
    console.error('错误详情:', error.message)
    if (error.data) {
      console.error('错误数据:', error.data)
    }

    // 返回友好的错误信息
    let message = '验证码发送失败，请稍后重试'
    if (error.code === 'InvalidMailAddress.NotFound') {
      message = '发信地址未配置，请联系管理员'
    } else if (error.code === 'InvalidReceiverName.Malformed') {
      message = '收件人邮箱格式不正确'
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

