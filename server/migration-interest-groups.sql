USE youthspark;

ALTER TABLE clubs
  MODIFY type ENUM('club', 'department', 'interest_group') DEFAULT 'club';
