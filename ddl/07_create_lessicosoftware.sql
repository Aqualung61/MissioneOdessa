-- DDL: Tabella LessicoSoftware (Bridge M:N)
CREATE TABLE LessicoSoftware (
    ID_Software INTEGER NOT NULL,
    ID_Voce INTEGER NOT NULL,
    PRIMARY KEY (ID_Software, ID_Voce),
    FOREIGN KEY (ID_Software) REFERENCES Software(ID_Software),
    FOREIGN KEY (ID_Voce) REFERENCES VociLessico(ID_Voce)
);
