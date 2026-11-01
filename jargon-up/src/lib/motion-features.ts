/**
 * Moteur d'animation chargé APRÈS le premier affichage (voir Providers / LazyMotion) :
 * le texte et les boutons s'affichent sans attendre ce code, utile en 3G.
 */
// domMax : toutes les animations de l'appli, y compris les mots qui « volent » (layoutId).
import { domMax } from "motion/react";

export default domMax;
