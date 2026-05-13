package com.example.webscreenbuilder.auth;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {
  @PostMapping("/login")
  public Map<String, String> login(@RequestBody Map<String, String> req) {
    return Map.of("token", AuthTokenInterceptor.MVP_TOKEN, "username", req.getOrDefault("username", "user"));
  }
}
