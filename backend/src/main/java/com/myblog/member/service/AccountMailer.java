package com.myblog.member.service;

import com.myblog.common.exception.InvalidInputException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class AccountMailer {
  private final JavaMailSender sender;
  private final boolean enabled;
  private final String from;

  public AccountMailer(
      JavaMailSender sender,
      @Value("${blog.member.mail-enabled:false}") boolean enabled,
      @Value("${blog.member.mail-from:}") String from) {
    this.sender = sender;
    this.enabled = enabled;
    this.from = from;
  }

  public boolean enabled() {
    return enabled && !from.isBlank();
  }

  public void send(String email, String purpose, String link) {
    if (!enabled()) throw new InvalidInputException("邮箱服务尚未启用，请联系博主");
    var message = new SimpleMailMessage();
    message.setFrom(from);
    message.setTo(email);
    message.setSubject(purpose.equals("REGISTER") ? "验证邮箱，加入憨Ant的小站" : "重置你的小站密码");
    message.setText(
        "请打开以下链接完成操作，有效期为 30 分钟，仅能使用一次。\n\n" + link + "\n\n如果不是你发起的请求，请忽略此邮件。请勿把链接转发给他人。");
    try {
      sender.send(message);
    } catch (org.springframework.mail.MailException error) {
      // Mail errors may contain credentials or recipient data; never return/log the transport
      // error.
      throw new InvalidInputException("邮件发送失败，请稍后重试或联系博主");
    }
  }
}
