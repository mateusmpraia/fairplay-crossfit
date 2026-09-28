package br.com.uff.fairplay.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Envia e-mails do sistema. Sem servidor SMTP configurado ({@code spring.mail.host}), o conteúdo é
 * escrito no log do backend — suficiente para desenvolvimento e para a apresentação do TCC.
 */
@Service
public class EnvioEmailService {

    private static final Logger log = LoggerFactory.getLogger(EnvioEmailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String remetente;

    public EnvioEmailService(ObjectProvider<JavaMailSender> mailSender,
                             @Value("${fairplay.email.remetente}") String remetente) {
        this.mailSender = mailSender;
        this.remetente = remetente;
    }

    public void enviar(String destinatario, String assunto, String texto) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("SMTP não configurado; e-mail que seria enviado para {}:\n  Assunto: {}\n  {}", destinatario, assunto, texto);
            return;
        }

        SimpleMailMessage mensagem = new SimpleMailMessage();
        mensagem.setFrom(remetente);
        mensagem.setTo(destinatario);
        mensagem.setSubject(assunto);
        mensagem.setText(texto);
        sender.send(mensagem);
    }
}
