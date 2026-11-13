package com.infotact.polyglotmesh.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ScriptRequest {

    @NotBlank(message = "Script name is required.")
    @Size(max = 120, message = "Script name must not exceed 120 characters.")
    private String name;

    @NotBlank(message = "Language is required.")
    @Pattern(regexp = "^(?i)(python|javascript|ruby)$", message = "Language must be 'javascript', 'python', or 'ruby'.")
    private String language;

    @NotBlank(message = "Source code cannot be empty.")
    @Size(max = 65536, message = "Source code must not exceed 64KB.")
    private String code;

    @Size(max = 300, message = "Description must not exceed 300 characters.")
    private String description;

    @Size(max = 80, message = "Author must not exceed 80 characters.")
    private String author;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLanguage() { return language != null ? language.trim().toLowerCase() : null; }
    public void setLanguage(String language) { this.language = language; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
}
