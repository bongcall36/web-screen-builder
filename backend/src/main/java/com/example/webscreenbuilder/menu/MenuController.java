package com.example.webscreenbuilder.menu;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/menus")
@CrossOrigin
public class MenuController {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final Path menuDir = Path.of("data", "menus");

  @GetMapping
  public List<Map<String, String>> menus() throws IOException {
    ensureMenuDir();
    List<Map<String, String>> rows = new ArrayList<>();
    if (!Files.exists(menuPath("m1"))) {
      rows.add(Map.of(
        "id", "m1",
        "name", "Sample Screen",
        "screenId", "sample-screen",
        "parentId", "",
        "targetType", "screen",
        "openMode", "inline"
      ));
    }

    try (var stream = Files.list(menuDir)) {
      stream
        .filter(path -> path.getFileName().toString().endsWith(".json"))
        .sorted()
        .forEach(path -> readMenu(path, rows));
    }
    return rows;
  }

  @PostMapping
  public ResponseEntity<?> save(@RequestBody Map<String, String> body) {
    String id = body.get("id");
    String name = body.get("name");
    String screenId = blankToEmpty(body.get("screenId"));
    String parentId = blankToEmpty(body.get("parentId"));
    String targetType = blankToDefault(body.get("targetType"), "screen");
    String openMode = blankToDefault(body.get("openMode"), "inline");
    String previousId = blankToEmpty(body.get("previousId"));

    if (!isValidId(id) || isBlank(name) || !isOptionalId(parentId) || !isOptionalId(previousId) || !isValidTargetType(targetType) || !isValidOpenMode(openMode)) {
      return ResponseEntity.badRequest().body(Map.of("error", "valid id, name, parentId, targetType, and openMode are required"));
    }

    if ("screen".equals(targetType) && !isValidId(screenId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "screen menus require a valid screenId"));
    }

    try {
      Map<String, String> row = new LinkedHashMap<>();
      row.put("id", id);
      row.put("name", name);
      row.put("screenId", screenId);
      row.put("parentId", parentId);
      row.put("targetType", targetType);
      row.put("openMode", openMode);
      ensureMenuDir();
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(menuPath(id).toFile(), row);
      if (!previousId.isBlank() && !previousId.equals(id)) {
        updateChildParentIds(previousId, id);
        Files.deleteIfExists(menuPath(previousId));
      }
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (IOException e) {
      return ResponseEntity.internalServerError().body(Map.of("error", "could not save menu"));
    }
  }

  @DeleteMapping("/{menuId}")
  public ResponseEntity<?> delete(@PathVariable String menuId) {
    if (!isValidId(menuId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid menuId"));
    }
    try {
      Files.deleteIfExists(menuPath(menuId));
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (IOException e) {
      return ResponseEntity.internalServerError().body(Map.of("error", "could not delete menu"));
    }
  }

  private void readMenu(Path path, List<Map<String, String>> rows) {
    try {
      Map<String, String> row = objectMapper.readValue(path.toFile(), new TypeReference<>() {});
      row.putIfAbsent("screenId", "");
      row.putIfAbsent("parentId", "");
      row.putIfAbsent("targetType", isBlank(row.get("screenId")) ? "folder" : "screen");
      row.putIfAbsent("openMode", "inline");
      rows.add(row);
    } catch (IOException ignored) {
      // Ignore broken MVP data files so one bad file does not break the runtime menu.
    }
  }

  private void ensureMenuDir() throws IOException {
    Files.createDirectories(menuDir);
  }

  private Path menuPath(String id) {
    return menuDir.resolve(id + ".json").normalize();
  }

  private void updateChildParentIds(String oldParentId, String newParentId) throws IOException {
    ensureMenuDir();
    try (var stream = Files.list(menuDir)) {
      for (Path path : stream.filter(item -> item.getFileName().toString().endsWith(".json")).toList()) {
        Map<String, String> row = objectMapper.readValue(path.toFile(), new TypeReference<>() {});
        if (oldParentId.equals(row.get("parentId"))) {
          row.put("parentId", newParentId);
          objectMapper.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), row);
        }
      }
    }
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private boolean isValidId(String value) {
    return value != null && value.matches("[A-Za-z0-9_-]+");
  }

  private boolean isOptionalId(String value) {
    return value == null || value.isBlank() || isValidId(value);
  }

  private boolean isValidTargetType(String value) {
    return "folder".equals(value) || "screen".equals(value);
  }

  private boolean isValidOpenMode(String value) {
    return "inline".equals(value) || "popup".equals(value);
  }

  private String blankToEmpty(String value) {
    return value == null ? "" : value.trim();
  }

  private String blankToDefault(String value, String defaultValue) {
    return isBlank(value) ? defaultValue : value.trim();
  }
}
