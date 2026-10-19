package io.github.danieltinois.resumetailor.common;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import io.github.danieltinois.resumetailor.auth.AuthException;
import io.github.danieltinois.resumetailor.profile.InvalidImportException;
import io.github.danieltinois.resumetailor.profile.ProfileValidationException;
import io.github.danieltinois.resumetailor.profile.VersionConflictException;

/**
 * Every error leaves as an RFC 7807 problem. Validation errors list the
 * offending paths; unexpected errors never expose their cause.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** A validation problem with {@code errors: [{path, message}]}. */
    public static ProblemDetail validation(List<Map<String, String>> errors) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, "Invalid request");
        problem.setProperty("errors", errors);
        return problem;
    }

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Not found");
    }

    @ExceptionHandler(UnauthenticatedException.class)
    ProblemDetail unauthenticated(UnauthenticatedException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    @ExceptionHandler(AuthException.class)
    ProblemDetail auth(AuthException e) {
        return ProblemDetail.forStatusAndDetail(e.status(), e.getMessage());
    }

    @ExceptionHandler(ProfileValidationException.class)
    ProblemDetail invalidProfile(ProfileValidationException e) {
        return validation(e.violations().stream()
                .map(violation -> Map.of("path", violation.path(), "message", violation.message()))
                .toList());
    }

    @ExceptionHandler(VersionConflictException.class)
    ProblemDetail conflict(VersionConflictException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(InvalidImportException.class)
    ProblemDetail invalidImport(InvalidImportException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception e) {
        LOG.error("Unexpected error", e);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error");
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException e,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<Map<String, String>> errors = e.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of("path", error.getField(), "message", String.valueOf(error.getDefaultMessage())))
                .toList();
        return ResponseEntity.unprocessableContent().body(validation(errors));
    }
}
