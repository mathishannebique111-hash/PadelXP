/**
 * Banque de 300 prenoms francais (hommes et femmes) pour le coach IA.
 * Un prenom est attribue de maniere deterministe a chaque utilisateur
 * via un hash de son userId.
 */

const COACH_NAMES = [
  // Hommes
  "Pablo", "Lucas", "Hugo", "Mathis", "Nathan", "Enzo", "Louis", "Gabriel",
  "Arthur", "Jules", "Adam", "Raphael", "Paul", "Tom", "Leo", "Ethan",
  "Nolan", "Theo", "Maxime", "Antoine", "Alexandre", "Victor", "Thomas",
  "Alexis", "Nicolas", "Romain", "Pierre", "Julien", "Kevin", "Florian",
  "Bastien", "Quentin", "Clement", "Dylan", "Valentin", "Benjamin", "Simon",
  "Axel", "Robin", "Adrien", "Matteo", "Samuel", "Martin", "Oscar", "Mael",
  "Gabin", "Liam", "Noah", "Aaron", "Sacha", "Rayan", "Timothe", "Loan",
  "Evan", "Nael", "Eliott", "Kylian", "Matheo", "Ilian", "Lenny", "Ruben",
  "Nino", "Esteban", "Lorenzo", "Diego", "Yann", "Tristan", "Damien",
  "Fabien", "Cedric", "Arnaud", "Sebastien", "Guillaume", "Olivier",
  "Philippe", "Stephane", "Laurent", "Christophe", "Frederic", "Pascal",
  "Vincent", "Jerome", "Emmanuel", "Franck", "David", "Mickael", "Xavier",
  "Thierry", "Didier", "Alain", "Patrick", "Remi", "Yvan", "Tanguy",
  "Corentin", "Dorian", "Killian", "Erwan", "Loic", "Thibault", "Charles",
  "Felix", "Edouard", "Augustin", "Gaspard", "Achille", "Emile", "Gustave",
  "Hector", "Marcel", "Lucien", "Andre", "Henri", "Albert", "Leon",
  "Ernest", "Fernand", "Raymond", "Gaston", "Eugene", "Anatole", "Camille",
  "Baptiste", "Benoit", "Cyril", "Denis", "Fabrice", "Gilles", "Herve",
  "Ivan", "Jacques", "Ludovic", "Marc", "Norbert", "Patrice", "Rodolphe",
  "Sylvain", "Thibaud", "Ugo", "Vivien", "William", "Yohan", "Zacharie",
  "Aymeric", "Brieuc", "Cassandre", "Dimitri", "Eloi", "Gauthier",
  "Hadrien", "Isidore", "Joris", "Lilian", "Malo", "Niels", "Pierrick",
  // Femmes
  "Emma", "Lea", "Chloe", "Manon", "Ines", "Jade", "Lola", "Sarah",
  "Louise", "Camille", "Oceane", "Clara", "Juliette", "Alice", "Eva",
  "Marie", "Romane", "Lucie", "Zoe", "Lena", "Margot", "Pauline",
  "Charlotte", "Laura", "Mathilde", "Anais", "Julie", "Morgane", "Marion",
  "Ambre", "Agathe", "Rose", "Lily", "Nina", "Noemie", "Elisa", "Maeva",
  "Clemence", "Victoria", "Apolline", "Jeanne", "Adele", "Mila", "Anna",
  "Lou", "Capucine", "Aurore", "Margaux", "Iris", "Luna", "Stella",
  "Celia", "Mia", "Olivia", "Alma", "Alix", "Roxane", "Yasmine", "Sofia",
  "Leonie", "Gabrielle", "Heloise", "Constance", "Eloise", "Salome",
  "Josephine", "Valentine", "Victoire", "Celestine", "Clementine",
  "Philippine", "Colombe", "Faustine", "Blandine", "Cassandra", "Justine",
  "Elodie", "Audrey", "Emilie", "Melanie", "Virginie", "Stephanie",
  "Nathalie", "Sophie", "Sandrine", "Isabelle", "Catherine", "Veronique",
  "Christine", "Patricia", "Monique", "Brigitte", "Martine", "Dominique",
  "Helene", "Laetitia", "Myriam", "Delphine", "Karine", "Geraldine",
  "Aurelie", "Priscilla", "Tatiana", "Alexia", "Anissa", "Charlene",
  "Daphne", "Eleonore", "Flora", "Gaelle", "Harmonie", "Ilona", "Janelle",
  "Kimberley", "Laurine", "Maelle", "Nawel", "Ophelie", "Perrine",
  "Rafaelle", "Sixtine", "Tiphaine", "Ursule", "Violette", "Wendy",
  "Yaelle", "Zelie", "Amandine", "Berenice", "Coralie", "Diane", "Estelle",
  "Fanny", "Gwenaelle", "Hortense", "Isaure", "Joana", "Lise", "Madeleine",
  "Noemi", "Penelope", "Rosalie", "Solene", "Thais", "Viviane",
];

/**
 * Retourne un prenom de coach deterministe pour un userId donne.
 * Le meme userId retournera toujours le meme prenom.
 */
export function getCoachName(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % COACH_NAMES.length;
  return COACH_NAMES[index];
}
