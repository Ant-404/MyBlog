package com.myblog.member.service;

import com.myblog.common.api.PageResponse;
import com.myblog.common.exception.*;
import com.myblog.common.validation.WebAddress;
import com.myblog.member.dto.MemberModels.*;
import com.myblog.member.repository.MemberRepository;
import com.myblog.member.repository.MemberRepository.Account;
import com.myblog.site.service.SiteSettingsService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {
  private final MemberRepository repository;
  private final PasswordEncoder encoder;
  private final AccountMailer mailer;
  private final SiteSettingsService settings;
  private final MemberRateLimiter limiter;
  private final String dummyHash;

  public MemberService(
      MemberRepository repository,
      PasswordEncoder encoder,
      AccountMailer mailer,
      SiteSettingsService settings,
      MemberRateLimiter limiter) {
    this.repository = repository;
    this.encoder = encoder;
    this.mailer = mailer;
    this.settings = settings;
    this.limiter = limiter;
    dummyHash = encoder.encode(UUID.randomUUID().toString());
  }

  public boolean mailEnabled() {
    return mailer.enabled();
  }

  private String email(String value) {
    return value.trim().toLowerCase(Locale.ROOT);
  }

  public static String hash(String token) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private void password(String password) {
    if (password.length() < 10 || password.getBytes(StandardCharsets.UTF_8).length > 72)
      throw new InvalidInputException("密码至少 10 个字符，UTF-8 编码不能超过 72 字节");
  }

  @Transactional
  public void send(EmailRequest input, String address) {
    limiter.check("mail-ip:" + address, 5);
    String email = email(input.email());
    limiter.check("mail-email:" + email, 3);
    if (!mailer.enabled()) throw new InvalidInputException("邮箱服务尚未启用，请联系博主");
    if (repository.recentToken(email, input.purpose())) return;
    var account = repository.email(email);
    if (input.purpose().equals("RESET")
        && (account.isEmpty() || account.get().profile().status().equals("BANNED"))) return;
    if (input.purpose().equals("REGISTER") && account.isPresent()) return;
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    String root = settings.get().publicUrl().replaceAll("/+$", "");
    String link =
        root
            + "/account?mode="
            + (input.purpose().equals("REGISTER") ? "register" : "reset")
            + "&email="
            + URLEncoder.encode(email, StandardCharsets.UTF_8)
            + "&token="
            + token;
    repository.token(hash(token), email, input.purpose());
    mailer.send(email, input.purpose(), link);
  }

  @Transactional
  public Profile register(RegisterRequest input, String address) {
    limiter.check("register:" + address, 10);
    password(input.password());
    String email = email(input.email());
    if (!repository.consume(hash(input.token()), email, "REGISTER"))
      throw new InvalidInputException("验证链接无效或已过期，请重新申请");
    if (repository.email(email).isPresent()) throw new InvalidInputException("无法完成注册，请尝试登录或重置密码");
    long id = repository.create(email, encoder.encode(input.password()), input.nickname().trim());
    return repository.id(id).orElseThrow().profile();
  }

  public Account login(LoginRequest input, String address) {
    limiter.check("login-ip:" + address, 20);
    limiter.check("login-email:" + email(input.email()), 10);
    if (input.password().getBytes(StandardCharsets.UTF_8).length > 72)
      throw new BadCredentialsException("邮箱或密码不正确");
    var found = repository.email(email(input.email()));
    boolean valid = encoder.matches(input.password(), found.map(Account::hash).orElse(dummyHash));
    if (!valid
        || found.isEmpty()
        || !List.of("ACTIVE", "MUTED").contains(found.get().profile().status()))
      throw new BadCredentialsException("邮箱或密码不正确");
    return found.get();
  }

  public Account current(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof Identity identity))
      throw new BadCredentialsException("请先登录用户账号");
    var account =
        repository.id(identity.id()).orElseThrow(() -> new BadCredentialsException("登录已失效"));
    if (identity.sessionVersion() != account.sessionVersion()
        || !List.of("ACTIVE", "MUTED").contains(account.profile().status()))
      throw new BadCredentialsException("登录已失效，请重新登录");
    return account;
  }

  public Profile commenter(Authentication authentication) {
    var profile = current(authentication).profile();
    if (!profile.status().equals("ACTIVE")) throw new InvalidInputException("账号已被禁言，暂时不能发布内容");
    return profile;
  }

  public PublicProfile publicProfile(long id) {
    var profile =
        repository
            .id(id)
            .map(Account::profile)
            .filter(p -> List.of("ACTIVE", "MUTED").contains(p.status()))
            .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
    return new PublicProfile(profile.id(), profile.nickname(), profile.avatar(), profile.bio());
  }

  @Transactional
  public void reset(ResetRequest input, String address) {
    limiter.check("reset:" + address, 10);
    password(input.password());
    String email = email(input.email());
    if (!repository.consume(hash(input.token()), email, "RESET"))
      throw new InvalidInputException("验证链接无效或已过期，请重新申请");
    var account = repository.email(email).orElseThrow(() -> new InvalidInputException("验证链接无效"));
    if (account.profile().status().equals("BANNED")) throw new InvalidInputException("账号不可用");
    repository.password(account.profile().id(), encoder.encode(input.password()));
  }

  public Profile edit(Authentication authentication, EditProfile input) {
    long id = current(authentication).profile().id();
    if (repository.profile(id, input, WebAddress.image(input.avatar())) != 1)
      throw new ConflictException("资料已被修改，请刷新后重试");
    return repository.id(id).orElseThrow().profile();
  }

  @Transactional
  public void changePassword(Authentication authentication, PasswordRequest input) {
    var account = current(authentication);
    password(input.password());
    if (!encoder.matches(input.currentPassword(), account.hash()))
      throw new InvalidInputException("当前密码不正确");
    repository.password(account.profile().id(), encoder.encode(input.password()));
  }

  @Transactional
  public void close(Authentication authentication, CloseRequest input) {
    var account = current(authentication);
    if (!encoder.matches(input.password(), account.hash()))
      throw new InvalidInputException("密码不正确");
    repository.close(account.profile().id());
  }

  public PageResponse<Profile> list(String keyword, int page) {
    return new PageResponse<>(repository.list(keyword, page), repository.count(keyword), page, 20);
  }

  public void state(long id, StateRequest input) {
    if (repository.state(id, input) != 1) throw new ConflictException("用户状态已更新，请刷新后重试");
  }
}
