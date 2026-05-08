package com.example.webscreenbuilder.menu;
import org.springframework.web.bind.annotation.*;import java.util.List;import java.util.Map;
@RestController @RequestMapping("/api/menus") @CrossOrigin
public class MenuController {
  @GetMapping public List<Map<String,String>> menus(){
    return List.of(Map.of("id","m1","name","Sample Screen","screenId","sample-screen"));
  }
}
