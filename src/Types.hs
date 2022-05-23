{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
module Types where
import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), (!), ToJSVal, create, (<#), JSString)
import Monadic (doFromJSVal)
import Data.Time.Calendar (Day)
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Yleiset ()
import Data.Aeson (FromJSON)
import Data.Text (unpack)

newtype OID = OID Text
  deriving (Show, Generic)

instance FromJSVal OID where
    fromJSVal = doFromJSVal "OID" $ \x -> do
        oid <- MaybeT $ fromJSVal x
        pure $ OID oid

data SRSName = EPSG3067 | CRS84
    deriving (Show, Generic)

data Direction = Inc | Dec
  deriving (Show, Generic)

instance FromJSVal Direction where
    fromJSVal = doFromJSVal "Direction" $ \x -> do
        y :: Char <- MaybeT $ fromJSVal x
        case y of
            '+' -> pure Inc
            '-' -> pure Dec
            _ -> mzero

-- Distance in meters
newtype Distance = Distance {
    meters :: Natural
} deriving (Show, Generic)

instance FromJSVal Distance where
    fromJSVal = doFromJSVal "Distance" $ \x -> do
        y <- MaybeT $ fromJSVal x
        pure $ Distance y

data Kmetaisyys = Kmetaisyys {
    ratakm :: Natural,
    etaisyys :: Distance
}

instance FromJSVal Kmetaisyys where
    fromJSVal = doFromJSVal "Kmetaisyys" $ \x -> do
        r <- MaybeT $ fromJSVal =<< x ! ("ratakm" :: Text)
        k  <- MaybeT $ fromJSVal =<< x ! ("etaisyys" :: Text)
        pure $ Kmetaisyys r k

data Ratakmetaisyys = Ratakmetaisyys {
    ratanumero :: Text,
    kmetaisyys :: Kmetaisyys
}

instance FromJSVal Ratakmetaisyys where
    fromJSVal = doFromJSVal "Ratakmetaisyys" $ \x -> do
        r <- MaybeT $ fromJSVal =<< x ! ("ratanumero" :: Text)
        k  <- MaybeT $ fromJSVal =<< x ! ("kmetaisyys" :: Text)
        pure $ Ratakmetaisyys r k

data Ratakmvali = Ratakmvali {
    ratanumero :: Text,
    alku :: Kmetaisyys,
    loppu :: Kmetaisyys
}

instance FromJSVal Ratakmvali where
    fromJSVal = doFromJSVal "Ratakmvali" $ \x -> do
        r <- MaybeT $ fromJSVal =<< x ! ("ratanumero" :: Text)
        a <- MaybeT $ fromJSVal =<< x ! ("alku" :: Text)
        l <- MaybeT $ fromJSVal =<< x ! ("loppu" :: Text)
        pure $ Ratakmvali r a l

data Pmsijainti = Pmsijainti {
    numero :: Natural,
    suunta :: Direction,
    etaisyys :: Distance
}

instance FromJSVal Pmsijainti where
    fromJSVal = doFromJSVal "Pmsijainti" $ \x -> do
        n <- MaybeT $ fromJSVal =<< x ! ("numero" :: Text)
        s  <- MaybeT $ fromJSVal =<< x ! ("suunta" :: Text)
        e  <- MaybeT $ fromJSVal =<< x ! ("etaisyys" :: Text)
        pure $ Pmsijainti n s e

newtype Revision = Revision {
    revisio :: Natural
} deriving (Show, Generic)

instance FromJSON Revision

data Revisions = Revisions {
    infra :: Text,
    etj2 :: Text
} deriving Show

instance FromJSVal Revisions where
    fromJSVal = doFromJSVal "Revisions" $ \x -> do
        i <- MaybeT $ fromJSVal =<< x ! ("infra" :: Text)
        e  <- MaybeT $ fromJSVal =<< x ! ("etj2" :: Text)
        pure $ Revisions i e

data Train = Train {
    departureDate :: Day,
    trainNumber :: Natural
} deriving Show

instance ToJSVal Train where
    toJSVal Train{..} = do
        o <- create
        o <# ("departureDate" :: JSString) $ toJSVal departureDate
        o <# ("trainNumber" :: JSString) $ toJSVal trainNumber
        toJSVal o

instance FromJSVal Train where
    fromJSVal = doFromJSVal "Train" $ \x ->
        Train <$> MaybeT (fromJSVal =<< x ! ("departureDate" :: JSString))
              <*> MaybeT (fromJSVal =<< x ! ("trainNumber" :: JSString))


data EITila = EILuonnos | EIHyvaksytty | EIPoistettu
    deriving Show

instance FromJSVal EITila where
    fromJSVal = doFromJSVal "EITila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "luonnos"    -> pure EILuonnos
            "hyväksytty" -> pure EIHyvaksytty
            "poistettu"  -> pure EIPoistettu
            _            -> mzero

data ESTila = ESLuonnos | ESLahetetty | ESLisatietopyynto | ESHyvaksytty | ESPeruttu | ESPoistettu
    deriving Show

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

data VSTila = VSTarveTunnistettu | VSVuosiohjelmissa | VSSuunniteltu | VSKaynnissa | VSTehty | VSPoistettu
    deriving Show

instance FromJSVal VSTila where
    fromJSVal = doFromJSVal "VSTila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "tarve tunnistettu" -> pure VSTarveTunnistettu
            "vuosiohjelmissa"   -> pure VSVuosiohjelmissa
            "suunniteltu"       -> pure VSSuunniteltu
            "käynnissä"         -> pure VSKaynnissa
            "tehty"             -> pure VSTehty
            "poistettu"         -> pure VSPoistettu
            _                   -> mzero

data LOITila = LOIAktiivinen | LOIPoistettu
    deriving Show

instance FromJSVal LOITila where
    fromJSVal = doFromJSVal "LOITila" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        case xx of
            "aktiivinen" -> pure LOIAktiivinen
            "poistettu"  -> pure LOIPoistettu
            _            -> mzero

data ElementtiTypeName = Akselinlaskija
                       | Baliisi
                       | Kuumakayntiilmaisin
                       | Liikennepaikanraja
                       | Opastin
                       | Puskin
                       | Pyoravoimailmaisin
                       | Raideeristys
                       | Pysaytyslaite
                       | Rfidlukija
                       | Ryhmityseristin
                       | Sahkoistyspaattyy
                       | Seislevy
                       | Vaihde
                       | Virroitinvalvontakamera
                       | Erotusjakso
                       | Erotuskentta
                       | Maadoitin
                       | Tyonaikaineneristin
                       | Kaantopoyta
                       | Pyoraprofiilimittalaite
                       | Telivalvonta
                       | Erotin
                       | Tasoristeysvalojenpyoratunnistin
    deriving (Show,Read)

instance FromJSVal ElementtiTypeName where
    fromJSVal = doFromJSVal "ElementtiTypeName" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        hoistMaybe $ readMaybe (unpack xx)