package com.myblog.auth.service;

import com.myblog.auth.dto.AdminUserResponse;
import com.myblog.auth.repository.AdminUserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AdminUserDetailsService implements UserDetailsService {
  private final AdminUserRepository repository;

  public AdminUserDetailsService(AdminUserRepository repository) {
    this.repository = repository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) {
    var user =
        repository
            .findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("账号不存在"));
    return User.withUsername(user.username())
        .password(user.passwordHash())
        .roles("ADMIN")
        .disabled(!user.enabled())
        .build();
  }

  public AdminUserResponse profile(String username) {
    var user =
        repository
            .findByUsername(username)
            .filter(value -> value.enabled())
            .orElseThrow(() -> new UsernameNotFoundException("账号不存在或已停用"));
    return new AdminUserResponse(user.username(), user.displayName());
  }
}
