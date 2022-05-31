{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}

module Jeti.Types where

import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), ToJSVal (toJSVal))
import Monadic (doFromJSVal)
import Yleiset ()



data JetiType = 
      Ennakkoilmoitus
    | Ennakkosuunnitelma
    | Vuosisuunnitelma
    | LOilmoitus
  deriving (Show, Enum, Bounded, Eq, Read)

instance ToJSVal JetiType where
    toJSVal = toJSVal . jetiType

instance FromJSVal JetiType where
  fromJSVal = doFromJSVal "JetiType" $ \x -> do
    nat <- MaybeT $ fromJSVal x
    hoistMaybe $ findJetiType nat

jetiType :: JetiType -> Natural
jetiType Ennakkoilmoitus = 80
jetiType Ennakkosuunnitelma = 81
jetiType Vuosisuunnitelma = 82
jetiType LOilmoitus = 83

jetiShortName :: JetiType -> Text
jetiShortName Ennakkoilmoitus = "EI"
jetiShortName Ennakkosuunnitelma = "ES"
jetiShortName Vuosisuunnitelma = "VS"
jetiShortName LOilmoitus = "LOI"

jetiTypes :: [JetiType]
jetiTypes = [minBound ..]

findJetiType :: Natural -> Maybe JetiType
findJetiType x = find ((== x) . jetiType) jetiTypes

findJetiTypeByShortName :: Text -> Maybe JetiType
findJetiTypeByShortName x = find ((== x) . jetiShortName) jetiTypes


data EITila = EILuonnos | EIHyvaksytty | EIPoistettu
    deriving (Show, Enum, Bounded)

instance FromJSVal EITila where
    fromJSVal = doFromJSVal "EITila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "luonnos"    -> pure EILuonnos
            "hyväksytty" -> pure EIHyvaksytty
            "poistettu"  -> pure EIPoistettu
            _            -> mzero

data ESTila = ESLuonnos | ESLahetetty | ESLisatietopyynto | ESHyvaksytty | ESPeruttu | ESPoistettu
    deriving (Show, Enum, Bounded)

instance FromJSVal ESTila where
    fromJSVal = doFromJSVal "ESTila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "luonnos"         -> pure ESLuonnos
            "lähetetty"       -> pure ESLahetetty
            "lisätietopyyntö" -> pure ESLisatietopyynto
            "hyväksytty"      -> pure ESHyvaksytty
            "peruttu"         -> pure ESPeruttu
            "poistettu"       -> pure ESPoistettu
            _                 -> mzero

data VSTila = VSAlustava | VSVuosiohjelmissa | VSToteutuu | VSKaynnissa | VSTehty | VSPoistettu
    deriving (Show, Enum, Bounded)

instance FromJSVal VSTila where
    fromJSVal = doFromJSVal "VSTila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "alustava"          -> pure VSAlustava
            "vuosiohjelmissa (tila poistunut käytöstä)" -> pure VSVuosiohjelmissa
            "toteutuu"          -> pure VSToteutuu
            "käynnissä (tila poistunut käytöstä)" -> pure VSKaynnissa
            "tehty"             -> pure VSTehty
            "poistettu"         -> pure VSPoistettu
            _                   -> mzero

data LOITila = LOIAktiivinen | LOIPoistettu
    deriving (Show, Enum, Bounded)

instance FromJSVal LOITila where
    fromJSVal = doFromJSVal "LOITila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "aktiivinen" -> pure LOIAktiivinen
            "poistettu"  -> pure LOIPoistettu
            _            -> mzero

eiTilat :: [EITila]
eiTilat = [minBound ..]

esTilat :: [ESTila]
esTilat = [minBound ..]

vsTilat :: [VSTila]
vsTilat = [minBound ..]

loiTilat :: [LOITila]
loiTilat = [minBound ..]
