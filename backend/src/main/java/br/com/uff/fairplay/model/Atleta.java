package br.com.uff.fairplay.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "atletas", uniqueConstraints = {
    @UniqueConstraint(name = "uk_cpf_perfil", columnNames = {"cpf", "perfil"}),
    @UniqueConstraint(name = "uk_email_perfil", columnNames = {"email", "perfil"}),
    @UniqueConstraint(name = "uk_celular_perfil", columnNames = {"celular", "perfil"})
})
public class Atleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomeCompleto;

    @Column(nullable = true, length = 14)
    private String cpf;

    @Column(nullable = false)
    private LocalDate dataNascimento;

    @Column(nullable = false, length = 20)
    private String genero;

    @Column(nullable = false, length = 15)
    private String celular;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String senha;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String estado;

    @Column(nullable = false, length = 100)
    private String nomeBox;

    @Column(nullable = false, length = 20)
    private String perfil; // ATLETA ou ORGANIZADOR

    @Transient
    private Integer totalHistoricos = 0;

    public Atleta() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNomeCompleto() { return nomeCompleto; }
    public void setNomeCompleto(String nomeCompleto) { this.nomeCompleto = nomeCompleto; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public LocalDate getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(LocalDate dataNascimento) { this.dataNascimento = dataNascimento; }

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public String getCelular() { return celular; }
    public void setCelular(String celular) { this.celular = celular; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getNomeBox() { return nomeBox; }
    public void setNomeBox(String nomeBox) { this.nomeBox = nomeBox; }

    public String getPerfil() { return perfil; }
    public void setPerfil(String perfil) { this.perfil = perfil; }

    public Integer getTotalHistoricos() { return totalHistoricos; }
    public void setTotalHistoricos(Integer totalHistoricos) { this.totalHistoricos = totalHistoricos; }
}