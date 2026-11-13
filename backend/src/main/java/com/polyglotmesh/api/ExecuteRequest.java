package com.polyglotmesh.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExecuteRequest(
    @NotBlank @Size(max = 20) String language,
    @NotBlank @Size(max = 20000) String code
) {}
