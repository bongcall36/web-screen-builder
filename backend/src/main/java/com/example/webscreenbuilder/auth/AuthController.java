package com.example.webscreenbuilder.auth;
import org.springframework.web.bind.annotation.*;import java.util.Map;
@RestController @RequestMapping("/api/auth") @CrossOrigin
public class AuthController {
  @PostMapping("/login")
  public Map<String,String> login(@RequestBody Map<String,String> req){
    return Map.of("token","mock-token","username", req.getOrDefault("username","user"));
  }
}
