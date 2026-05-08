package com.example.webscreenbuilder.screen;
import org.springframework.web.bind.annotation.*;import java.util.Map;import java.util.concurrent.ConcurrentHashMap;
@RestController @RequestMapping("/api/screens") @CrossOrigin
public class ScreenController {
  private final ConcurrentHashMap<String, Map<String,String>> store = new ConcurrentHashMap<>();
  public ScreenController(){
    store.put("sample-screen", Map.of("screenId","sample-screen","name","Sample Screen","json","{\"components\":[{\"id\":\"input1\",\"type\":\"Input\",\"props\":{\"placeholder\":\"Type name\"}},{\"id\":\"btn1\",\"type\":\"Button\",\"props\":{\"text\":\"Search\"}},{\"id\":\"grid1\",\"type\":\"AgGrid\",\"props\":{\"columnDefs\":[{\"field\":\"id\"},{\"field\":\"name\"}],\"rowData\":[{\"id\":1,\"name\":\"Alice\"},{\"id\":2,\"name\":\"Bob\"}]}}]}"));
  }
  @PostMapping public Map<String,String> save(@RequestBody Map<String,String> payload){ store.put(payload.get("screenId"), payload); return Map.of("result","ok"); }
  @GetMapping("/{screenId}") public Map<String,String> get(@PathVariable String screenId){ return store.get(screenId); }
}
