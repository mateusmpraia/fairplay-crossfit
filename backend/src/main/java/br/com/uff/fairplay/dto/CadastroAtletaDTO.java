package br.com.uff.fairplay.dto;

import java.time.LocalDate;
import java.util.List;

public record CadastroAtletaDTO(
    String nomeCompleto,
    String cpf,
    LocalDate dataNascimento,
    String genero,
    String celular,
    String email,
    String senha,
    String cidade,
    String estado,
    String nomeBox,
    String perfil,                     // "ATLETA" (padrão) ou "ORGANIZADOR"
    List<Long> historicoIds,           // opcional: competições do histórico que o atleta marcou como suas
    List<Long> historicoRecusadosIds   // opcional: competições que ele desmarcou (declarou não serem dele)
) {}
